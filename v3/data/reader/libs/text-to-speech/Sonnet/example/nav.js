/* global Navigate */

const nav = new Navigate();

document.getElementById('backward').onclick = () => console.log(nav.line('backward'));
document.getElementById('forward').onclick = () => console.log(nav.line('forward'));
document.getElementById('next-paragraph').onclick = () => console.log(nav.paragraph('forward'));
document.getElementById('previous-paragraph').onclick = () => console.log(nav.paragraph('backward'));
document.getElementById('reset').onclick = () => {
  const s = nav.string();
  nav.relocate(s.trim().length ? false : true);
};
