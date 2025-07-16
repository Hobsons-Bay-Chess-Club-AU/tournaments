$(document).ready(function () {
    console.log("Rating group script loaded");

    $(".table-responsive").append('<button class="btn btn-primary mb-3" id="cccode">COPY</button>');

    $("#cccode").click(function () {
        const tablesText = [];
        $("table").each(function () {
            // Collect all rows (header + body) as arrays of cell strings
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
                    row.push($(this).text().trim());
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
        alert("Copied table as text to clipboard!");
    });
});