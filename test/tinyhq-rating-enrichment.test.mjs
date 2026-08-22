import assert from "node:assert/strict";
import test from "node:test";

import {
  enrichAttendeeRatings,
  enrichEventSnapshots,
  normaliseName,
} from "../src/tinyhq-rating-enrichment.mjs";

test("enriches an attendee with all FIDE and ACF ratings", () => {
  const attendee = {
    firstName: "Jane",
    lastName: "Smith",
    fideId: null,
  };
  const acfClassicPlayer = {
    name: "Jane Smith",
    acfId: "ACF-100",
    fideId: "1234567",
    rating: 1640,
  };
  const acfQuickPlayer = {
    ...acfClassicPlayer,
    rating: 1590,
  };
  const fidePlayer = {
    fideid: "1234567",
    fed: "AUS",
    rating: 1880,
    rapid_rating: 1800,
    blitz_rating: 1750,
  };

  const enriched = enrichAttendeeRatings(attendee, {
    acfClassicMap: new Map([["jane smith", acfClassicPlayer]]),
    acfQuickMap: new Map([["jane smith", acfQuickPlayer]]),
    fideMap: new Map([["1234567", fidePlayer]]),
  });

  assert.deepEqual(enriched, {
    ...attendee,
    fideId: "1234567",
    acfId: "ACF-100",
    fideStandard: 1880,
    fideRapid: 1800,
    fideBlitz: 1750,
    acfClassic: 1640,
    acfQuick: 1590,
  });
});

test("does not use a non-Australian FIDE player for a name-only match", () => {
  const attendee = {
    firstName: "Alex",
    lastName: "Lee",
    fideId: null,
  };

  const enriched = enrichAttendeeRatings(attendee, {
    acfClassicMap: new Map(),
    acfQuickMap: new Map(),
    fideMap: new Map([["alexlee", [{ fideid: "998877", fed: "USA", rating: 2200 }]]]),
  });

  assert.equal(enriched.fideId, null);
  assert.equal(enriched.fideStandard, 0);
  assert.equal(enriched.fideRapid, 0);
  assert.equal(enriched.fideBlitz, 0);
  assert.equal(enriched.acfClassic, 0);
  assert.equal(enriched.acfQuick, 0);
});

test("matches surname-first FIDE and ACF names when an attendee has no FIDE ID", () => {
  const attendee = {
    firstName: "Nyra",
    lastName: "Venkat",
    fideId: null,
  };
  const acfPlayer = {
    name: "Venkat, Nyra",
    acfId: "ACF-200",
    fideId: "3286410",
    rating: 1465,
  };
  const fidePlayer = {
    fideid: "3286410",
    fed: "AUS",
    rating: 1510,
    rapid_rating: 1490,
    blitz_rating: 1475,
  };

  const enriched = enrichAttendeeRatings(attendee, {
    acfClassicMap: new Map([["nyra venkat", acfPlayer]]),
    acfQuickMap: new Map([["nyra venkat", acfPlayer]]),
    fideMap: new Map([["3286410", fidePlayer], ["nyra venkat", [fidePlayer]]]),
  });

  assert.deepEqual(enriched, {
    ...attendee,
    fideId: "3286410",
    acfId: "ACF-200",
    fideStandard: 1510,
    fideRapid: 1490,
    fideBlitz: 1475,
    acfClassic: 1465,
    acfQuick: 1465,
  });
});

test("normalises surname-first names to the same lookup key", () => {
  assert.equal(normaliseName("Nyra Venkat"), "nyra venkat");
  assert.equal(normaliseName("Venkat, Nyra"), "nyra venkat");
});

test("skips an ambiguous Australian FIDE name-only match", () => {
  const enriched = enrichAttendeeRatings(
    { firstName: "Alex", lastName: "Lee", fideId: null },
    {
      acfClassicMap: new Map(),
      acfQuickMap: new Map(),
      fideMap: new Map([["alex lee", [
        { fideid: "1111111", fed: "AUS", rating: 1800 },
        { fideid: "2222222", fed: "AUS", rating: 1900 },
      ]]]),
    },
  );

  assert.equal(enriched.fideId, null);
  assert.equal(enriched.fideStandard, 0);
});

test("enriches every attendee in the upcoming-event snapshot", () => {
  const snapshot = [{
    event: { id: 42, name: "Future Open" },
    contacts: [{ firstName: "Jane", lastName: "Smith", fideId: "1234567" }],
  }];
  const fidePlayer = {
    fideid: "1234567",
    fed: "AUS",
    rating: 1880,
    rapid_rating: 1800,
    blitz_rating: 1750,
  };

  const enriched = enrichEventSnapshots(snapshot, {
    acfClassicMap: new Map(),
    acfQuickMap: new Map(),
    fideMap: new Map([["1234567", fidePlayer]]),
  });

  assert.equal(enriched[0].contacts[0].fideStandard, 1880);
  assert.equal(enriched[0].contacts[0].fideRapid, 1800);
  assert.equal(enriched[0].contacts[0].fideBlitz, 1750);
  assert.equal(enriched[0].contacts[0].acfClassic, 0);
  assert.equal(enriched[0].contacts[0].acfQuick, 0);
});
