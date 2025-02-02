const post = (method, data) => top.postMessage({
  method,
  data
}, '*');

document.addEventListener('click', e => {
  const command = e.target.dataset.command;
  if (command === 'spellcheck') {
    const b = document.documentElement.dataset.spellcheck === 'false';
    document.documentElement.dataset.spellcheck = b;
    post('spellcheck:' + b);
  }
  else if (command) {
    post(command);
  }
});
document.getElementById('heading').onchange = e => post('heading-' + e.target.value);

// move
document.getElementById('move').onmousedown = () => {
  document.onmousemove = e => {
    post('move', {
      dx: e.movementX,
      dy: e.movementY
    });
  };
};
document.onmouseup = () => {
  document.onmousemove = '';
};

// spellcheck
onmessage = e => {
  const {method, value} = e.data;
  if (method === 'spellcheck') {
    document.documentElement.dataset.spellcheck = value;
  }
};

//
top.links(document);
