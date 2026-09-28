/* global Navigate, NavigateLegacy */

{
  const doc = document.getElementById('doc');
  const tbody = document.querySelector('#log tbody');
  const engineSelect = document.getElementById('engine');
  const predictBox = document.getElementById('predict');
  let counter = 0;

  const make = Engine => new class extends Engine {
    scroll() {}
  }();

  const run = (op, nav, engineName) => {
    const [name, arg] = engineName;
    if (name === 'relocate') {
      nav.relocate(arg !== 'selection');
      return '';
    }
    if (name === 'reset') {
      nav.relocate(true);
      return '';
    }
    return nav[name](arg || 'forward');
  };

  const ops = {
    'line-forward': ['line', 'forward'],
    'line-backward': ['line', 'backward'],
    'paragraph-forward': ['paragraph', 'forward'],
    'paragraph-backward': ['paragraph', 'backward'],
    'relocate-top': ['relocate', 'top'],
    'relocate-selection': ['relocate', 'selection'],
    'reset': ['relocate', 'top'],
    'clear': null
  };

  const engines = {
    v1: ['V1', NavigateLegacy],
    v2: ['V2', Navigate]
  };

  document.getElementById('controls').onclick = e => {
    const button = e.target.closest('button');
    if (!button) {
      return;
    }
    const op = button.dataset.op;

    if (op === 'clear') {
      tbody.textContent = '';
      counter = 0;
      return;
    }

    const which = engineSelect.value;
    const list = which === 'both' ? ['v1', 'v2'] : [which];
    const predict = predictBox.checked;

    // each engine gets a fresh instance so both start from identical state
    const results = list.map(engine => {
      const [label, Ctor] = engines[engine];
      const nav = make(Ctor);
      nav.predict = predict;
      const status = run(op, nav, ops[op]);
      return {
        label,
        nav,
        status,
        text: nav.string()
      };
    });

    const row = document.createElement('tr');
    const same = results.length === 1 ||
      results[0].status === results[1].status &&
      results[0].text === results[1].text;

    if (results.length === 2) {
      row.className = same ? 'match' : 'mismatch';
    }

    row.innerHTML = `
      <td class="num">${counter += 1}</td>
      <td>${op}${predict ? ' (predict)' : ''}</td>
      <td>${results[0]?.status ?? ''}</td>
      <td class="result">${esc(results[0]?.text ?? '')}</td>
      <td>${results[1]?.status ?? ''}</td>
      <td class="result">${esc(results[1]?.text ?? '')}</td>
      <td>${results.length === 2 ? (same ? 'OK' : 'DIFF') : 'single'}</td>
    `;
    tbody.append(row);

    if (results.length === 1) {
      window.__harnessNav = results[0].nav;
    }
    if (predict && results[0]?.nav['next_matched_string']) {
      const cell = document.createElement('div');
      cell.textContent = 'next: ' + results[0].nav['next_matched_string'];
      cell.style.color = '#777';
      row.cells[3].append(cell);
    }
  };

  const esc = s => s
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('\n', '⏎');
}
