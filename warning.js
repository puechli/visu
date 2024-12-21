// Make the overlay draggable
let overlay = document.getElementById('warningOverlay');

function hideOverlay() {
    document.getElementById('warningOverlay').style.display = 'none';
    document.getElementById('warningSign').style.display = 'block';
}

function showOverlay() {
    document.getElementById('warningOverlay').style.display = 'block';
    document.getElementById('warningSign').style.display = 'none';
}

overlay.onmousedown = function(event) {
    // Calculate the initial shift based on the mouse position relative to the overlay
    let shiftX = event.clientX - overlay.getBoundingClientRect().left;
    let shiftY = event.clientY - overlay.getBoundingClientRect().top;

    // Adjust the initial position based on the current scroll position
    moveAt(event.pageX - window.scrollX, event.pageY - window.scrollY);

    function moveAt(pageX, pageY) {
        // Update the overlay's position, taking into account the scroll position
        overlay.style.left = pageX - shiftX + 'px';
        overlay.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(event) {
        // Adjust the mouse position by the current scroll position
        moveAt(event.pageX - window.scrollX, event.pageY - window.scrollY);
    }

    // Attach the mousemove event listener
    document.addEventListener('mousemove', onMouseMove);

    // Remove the mousemove event listener when the mouse button is released
    overlay.onmouseup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        overlay.onmouseup = null;
    };
};

// Prevent the default drag-and-drop behavior
overlay.ondragstart = function() {
    return false;
};
