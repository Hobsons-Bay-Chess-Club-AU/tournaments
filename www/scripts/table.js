$(document).ready(function () {
    console.log("Rating group script loaded");

    $(".table-responsive").append('<button class="btn btn-primary mb-3" id="cccode">COPY</button>');

    $("#cccode").click(function () {
        const tablesText = [];
        $("table").each(function () {
            const rows = [];
            // Get headers
            const headers = [];
            $(this).find("thead tr th").each(function () {
                headers.push($(this).text().trim());
            });
            if (headers.length > 0) {
                rows.push(headers);
            }
            // Get rows
            $(this).find("tbody tr").each(function () {
                const row = [];
                $(this).find("td").each(function () {
                    let cellText = $(this).text().trim();
                    const playerDiv = $(this).find('.player-container');
                    if (playerDiv.length) {
                        // Extract player name
                        let name = playerDiv.find('.player-name-box2 span').text().trim();
                        // Extract rating
                        let rating = playerDiv.find('.rating').text().trim();
                        // Extract federation (country)
                        let fedImg = playerDiv.find('.fed img');
                        let country = '';
                        if (fedImg.length) {
                            country = fedImg.attr('alt') || '';
                        }
                        // Format: Name (Rating, Country)

                    } else if ($(this).find('.res').length && $(this).find('.cb').length) {
                        // Handle result/cb cell
                        let res = $(this).find('.res').text().trim();
                        let cb = $(this).find('.cb').text().trim();
                        cellText = `${res} <-> ${cb}`;
                    }
                    row.push(cellText);
                });
                rows.push(row);
            });
            // Calculate max width for each column
            const colWidths = [];
            rows.forEach(row => {
                row.forEach((cell, i) => {
                    colWidths[i] = Math.max(colWidths[i] || 0, cell.length);
                });
            });
            // Build aligned text
            let tableText = rows.map(row =>
                row.map((cell, i) => cell.padEnd(colWidths[i] || 0, ' ')).join('  ')
            ).join("\n");
            tablesText.push(tableText.trim());
        });
        const textArea = document.createElement("textarea");
        textArea.value = tablesText.join("\n\n");
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        // Snackbar notification with animation and loader bar
        let snackbar = document.createElement('div');
        snackbar.innerText = "Copied table as text to clipboard!";
        snackbar.className = 'custom-snackbar';
        // Loader bar
        let loader = document.createElement('div');
        loader.className = 'custom-snackbar-loader';
        snackbar.appendChild(loader);
        document.body.appendChild(snackbar);
        // Trigger animation
        setTimeout(function () {
            snackbar.classList.add('show');
        }, 10);
        // Animate loader bar
        loader.style.width = '100%';
        loader.style.transition = 'width 5s linear';
        setTimeout(function () {
            loader.style.width = '0%';
        }, 20);
        // Hide after 5s
        setTimeout(function () {
            snackbar.classList.remove('show');
            setTimeout(function () {
                if (snackbar.parentNode) snackbar.parentNode.removeChild(snackbar);
            }, 500);
        }, 5000);
    })
});