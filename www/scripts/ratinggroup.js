// A $( document ).ready() block.
$(document).ready(function () {
    var girls = [];
    $('table').each(function () {
        var t = $(this).find('tr:has(.female)').filter(function (index) {
            return $(this).index() >= 0;
        });
        t.each((index, el) => girls.push($(el).clone()));
        //girls = [...girls, ...t]
    });
    $('table thead tr').append('<th>Prize</th>')
    const existingTable = $("table:first").clone();
    $('tbody tr', existingTable).remove();
    existingTable.find('tbody').append(girls)
    $('tr', existingTable).each((index, element) => {
        $('td:first', element).text(index + 1)

    });
    $("div.table-responsive:first").append(`<h5 class="mb-4 mt-4">Girls</h5>`)
    var el = $(`<div class="table-responsive" id=""></div>`)
    console.log(existingTable)
    el.append(existingTable);

    $("div.table-responsive:first").append(el);
    var prizes = ["Winner", "1st Runner Up", "2nd Runner Up", "3rd Runner Up"]
    setTimeout(() => {
        $('table tbody').each(function (index1) {
            $(this).find('tr').each(function (index) {
                var td = $('<td class="wf-bold" ></td>');
                $(this).append(td)
                var prizeCount = 4;
                if (index1 == 3)
                    prizeCount = 2;
                if (index > prizeCount) {
                    // $(this).css('background-color', '#333');
                    // $(this).css('color', 'gray');
                    // $(this).css('opacity', '0.25')
                } else {
                    //td.text(prizes[index])
                }
            });
        });
    }, 100)

});