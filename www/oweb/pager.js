var pagerButtons = [];
var listContainer = null;

function init () {

	pagerButtons = document.body.querySelectorAll('a.page-link');

	if ( pagerButtons.length < 1 ) return false;

	for ( var i = 0; i < pagerButtons.length; i++ ) {

		pagerButtons[i].addEventListener('click', onClickPager);

	}

}

function onClickPager ( event ) {

	var target = event.target;
	var pagerList = target.parentNode.parentNode;

	clearActivePagers(pagerList);
	getData(target, pagerList);

}

function clearActivePagers ( list ) {

	var items = list.querySelectorAll('.page-item');

	for ( var i = 0; i < items.length; i++ ) {
		items[i].classList.remove('active');
	}

}

function getData ( target, pagerList ) {

	var origin = window.location.origin;
	listContainer = pagerList.parentNode.parentNode.querySelector('.table-responsive');
	var url = origin + target.getAttribute('data-page');
	target.parentNode.classList.add('active');

	setLoader();

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.setRequestHeader('Content-Type', 'text');

	xhr.onreadystatechange = function () {

		if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                onLoad(xhr.responseText);
            } else if (xhr.status >= 400) {
                onError(xhr.responseText);
            }
        }

	}

	xhr.send();

}

function onLoad ( htmlStr ) {

    listContainer.innerHTML = htmlStr;

}

function onError () {

	console.log('Something went wrong');

}

function setLoader () {

	listContainer.innerHTML = '<div class="content-loader"><div></div><div></div></div>';

}

(function() {

	init();

})();