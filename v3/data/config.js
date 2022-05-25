/**
    Reader View - Strips away clutter

    Copyright (C) 2014-2021 [@rNeomy](https://add0n.com/chrome-reader-view.html)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/rNeomy/reader-view/
    Homepage: https://add0n.com/chrome-reader-view.html
*/

/* global defaults */
'use strict';

// iframe issue
if (window.top !== window) {
  chrome = top.chrome;
}

// do not load config when possible
if (typeof config === 'undefined') {
  const config = {
    callbacks: [], // will be called when prefs are ready,
    onChanged: []
  };
  window.config = config;

  config.prefs = defaults;

  chrome.storage.onChanged.addListener(prefs => {
    Object.keys(prefs).forEach(key => config.prefs[key] = prefs[key].newValue);
    config.onChanged.forEach(c => c(prefs));
  });

  chrome.storage.local.get(config.prefs, prefs => {
    Object.assign(config.prefs, prefs);
    config.ready = true;
    config.callbacks.forEach(c => c());
  });
  config.load = c => {
    if (config.ready) {
      c();
    }
    else {
      config.callbacks.push(c);
    }
  };
}

