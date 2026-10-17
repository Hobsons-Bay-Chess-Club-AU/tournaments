use async_trait::async_trait;
use unftp_core::auth::{AuthenticationError, Authenticator, Credentials, Principal};
use std::collections::HashMap;

/// Authenticator that validates FTP logins against allowed username-password keypairs.
/// Keypairs are loaded from environment variables (`FTP_USERNAME`, `FTP_PASSWORD`),
/// `.env` file, or compiled binary secrets from the CI build server.
#[derive(Debug, Clone)]
pub struct KeypairAuthenticator {
    valid_users: HashMap<String, String>,
}

impl KeypairAuthenticator {
    /// Creates an authenticator from comma-separated usernames and passwords.
    /// E.g. `user1,user2` and `pass1,pass2` maps `user1 -> pass1` and `user2 -> pass2`.
    pub fn new(usernames_csv: &str, passwords_csv: &str) -> Self {
        let mut valid_users = HashMap::new();
        let users: Vec<&str> = usernames_csv
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        let passes: Vec<&str> = passwords_csv
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        for (u, p) in users.into_iter().zip(passes.into_iter()) {
            valid_users.insert(u.to_string(), p.to_string());
        }

        Self { valid_users }
    }

    /// Load configured keypairs following priority:
    /// 1. Runtime environment variables / `.env` (`FTP_USERNAME`, `FTP_PASSWORD`)
    /// 2. Compile-time embedded secrets from the build server (`option_env!`)
    /// 3. Local fallback default (`vega:vega`) for development/testing if none are defined
    pub fn from_env_or_default() -> Self {
        let _ = dotenvy::dotenv();

        let usernames = std::env::var("FTP_USERNAME")
            .ok()
            .or_else(|| option_env!("FTP_USERNAME").map(|s| s.to_string()))
            .unwrap_or_else(|| "vega".to_string());

        let passwords = std::env::var("FTP_PASSWORD")
            .ok()
            .or_else(|| option_env!("FTP_PASSWORD").map(|s| s.to_string()))
            .unwrap_or_else(|| "vega".to_string());

        Self::new(&usernames, &passwords)
    }

    /// Checks if a username and password match any authorized keypair.
    pub fn is_allowed(&self, username: &str, password: &str) -> bool {
        self.valid_users
            .get(username)
            .map_or(false, |expected| expected == password)
    }

    /// Returns the list of authorized usernames (passwords are omitted).
    pub fn usernames(&self) -> Vec<String> {
        let mut names: Vec<String> = self.valid_users.keys().cloned().collect();
        names.sort();
        names
    }

    /// Number of configured authorized users.
    pub fn user_count(&self) -> usize {
        self.valid_users.len()
    }
}

#[async_trait]
impl Authenticator for KeypairAuthenticator {
    async fn authenticate(
        &self,
        username: &str,
        creds: &Credentials,
    ) -> Result<Principal, AuthenticationError> {
        let expected_password = self
            .valid_users
            .get(username)
            .ok_or(AuthenticationError::BadUser)?;

        match &creds.password {
            Some(pass) if pass == expected_password => Ok(Principal {
                username: username.to_string(),
            }),
            _ => Err(AuthenticationError::BadPassword),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_keypair_authentication_success() {
        let auth = KeypairAuthenticator::new("alice, bob, charlie", "pass1, pass2, pass3");
        assert_eq!(auth.user_count(), 3);

        let creds_alice: Credentials = "pass1".into();
        let res_alice = auth.authenticate("alice", &creds_alice).await;
        assert!(res_alice.is_ok());
        assert_eq!(res_alice.unwrap().username, "alice");

        let creds_bob: Credentials = "pass2".into();
        let res_bob = auth.authenticate("bob", &creds_bob).await;
        assert!(res_bob.is_ok());
        assert_eq!(res_bob.unwrap().username, "bob");
    }

    #[tokio::test]
    async fn test_keypair_authentication_invalid_password() {
        let auth = KeypairAuthenticator::new("alice", "secret");
        let creds: Credentials = "wrong".into();
        let res = auth.authenticate("alice", &creds).await;
        assert!(matches!(res, Err(AuthenticationError::BadPassword)));
    }

    #[tokio::test]
    async fn test_keypair_authentication_unknown_user() {
        let auth = KeypairAuthenticator::new("alice", "secret");
        let creds: Credentials = "secret".into();
        let res = auth.authenticate("mallory", &creds).await;
        assert!(matches!(res, Err(AuthenticationError::BadUser)));
    }

    #[tokio::test]
    async fn test_whitespace_and_empty_entries() {
        let auth = KeypairAuthenticator::new(" arbiter1 ,  arbiter2 , ", " p1 , p2 , ");
        assert_eq!(auth.user_count(), 2);
        assert!(auth.is_allowed("arbiter1", "p1"));
        assert!(auth.is_allowed("arbiter2", "p2"));
        assert!(!auth.is_allowed("arbiter1", "p2"));
    }
}
