var toggleBtn = null;
var collapses = [];
var isToggling = false;
var isOpenedAll = false;

function init () {

	toggleBtn = document.getElementById('btn-show-all');
	collapses = document.body.querySelectorAll('.stat-collapse');

	toggleBtn.addEventListener('click', toggleCollapses);

}

function toggleCollapses () {

	if ( isToggling ) return;
	isToggling = true;

	for ( var i = 0; i < collapses.length; i++ ) {

		var bsCollapse = new bootstrap.Collapse(collapses[i], {
			toggle: true
		});

	}

	setTimeout(function () {

		isOpenedAll = !isOpenedAll;

		if ( isOpenedAll ) toggleBtn.innerText = 'Hide Players';
		if ( !isOpenedAll ) toggleBtn.innerText = 'Show Players';
		isToggling = false;

	}, 400)

}

(function() {

	init();

})();