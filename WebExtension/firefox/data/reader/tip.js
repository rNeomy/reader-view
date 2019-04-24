'use strict';

var tips = [
  'By selecting the actual content or part of it before switching to the reader view, you can prevent unwanted content from cluttering your view. This is also useful if the automatic selection module fails to detect the correct content.'
];

for (let i = 0; i < tips.length; i += 1) {
  if (localStorage.getItem('tip.' + i) !== 's') {
    localStorage.setItem('tip.' + i, 's');
    document.querySelector('#tips span').textContent = tips[i];
    document.body.dataset.tips = true;
    break;
  }
}

document.querySelector('#tips input').addEventListener('click', () => {
  document.body.dataset.tips = false;
});
