(({ document, localStorage, XMLHttpRequest }) => {
  /**
   * Quick references for page elements
   */
  const url = document.querySelector('#form [name="url"]');
  const method = document.querySelector('#form [name="method"]');
  const collection = document.querySelector('#form [name="collection"]');
  const textarea = document.querySelector('textarea');
  const submit = document.querySelector('#execute');

  /**
   * Hold result in memory for pagination
   */
  let result;

  /**
   * Syntax highlight JSON
   * @param {object|string} text - JSON text to syntax highlight
   * @returns {string}
   */
  const syntaxHighlight = (text) => {
    let json = text;
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) cls = 'key';
          else cls = 'string';
        } else if (/true|false/.test(match)) cls = 'boolean';
        else if (/null/.test(match)) cls = 'null';

        return `<span class="${cls}">${match}</span>`;
      },
    );
  };

  /**
   * Query list of collections to aid user when user leaves the URL field
   */
  url.addEventListener('blur', (event) => {
    let body = {
      url: event.target.value,
    };
    if (!body.url) return;

    body = JSON.stringify(body);

    // Send request
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/get-collections', true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Handle response
    xhr.addEventListener('readystatechange', function handleResponse() {
      if (this.readyState === 4) {
        let collections = this.response;

        if (!collections || !(collections instanceof Array)) return;

        // Sort the array by name
        collections = collections.sort((first, second) => {
          const a = first.name.toUpperCase();
          const b = second.name.toUpperCase();
          if (a < b) return -1;
          return 1;
        });

        // Get settings
        let settings = localStorage.getItem('tab1');
        if (settings) settings = JSON.parse(settings);
        else settings = {};

        // Add to local storage
        settings.collections = collections;
        localStorage.setItem('tab1', JSON.stringify(settings));

        // Then populate select field
        collections.forEach((col) => {
          const option = document.createElement('option');
          option.value = col.name;
          option.textContent = col.name;
          collection.appendChild(option);
        });
      }
    });

    xhr.send(body);
  });

  /**
   * Handle form submission
   */
  submit.addEventListener('click', (event) => {
    event.preventDefault();

    const form = document.querySelector('#form');

    // We use eval here since it's the only way to convert textarea
    // value into JavaScript given that the value may not be proper
    // JSON and formatting a JavaScript object into proper JSON is
    // a huge pain.
    // eslint-disable-next-line no-eval
    const data = eval(document.querySelector('textarea').value);

    // Prepare body data
    let body = {
      url: form.url.value,
      method: form.method.value,
      collection: form.collection.value,
      data,
    };

    if (!body.url || !body.method || !body.collection) return;

    // Show loading spinner
    document.querySelector('#execute .play').classList.add('hide');
    document.querySelector('#loader').classList.remove('hide');

    body = JSON.stringify(body);

    // Send data
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/', true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Handle response
    xhr.addEventListener('readystatechange', function handleResponse() {
      const response = document.querySelector('#response');

      if (this.readyState === 4) {
        // Hide loading spinner
        document.querySelector('#loader').classList.add('hide');
        document.querySelector('#execute .play').classList.remove('hide');

        result = this.response;

        if (result && result instanceof Array) {
          response.innerHTML = syntaxHighlight(result.slice(0, 10));
        } else response.innerHTML = syntaxHighlight(result);
      }
    });

    xhr.send(body);
  });

  /**
   * Help save user some time in textarea
   */
  textarea.addEventListener('keydown', (event) => {
    const keyCode = event.keyCode || event.which;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const first = textarea.value.substr(0, start);
    const last = textarea.value.substr(end);

    // Tab key
    if (keyCode === 9) {
      event.preventDefault(); // don't move away from textarea

      // Add spaces
      textarea.value = `${first}  ${last}`;

      // Place cursor after spaces
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = textarea.selectionStart;
    }

    // Braces and brackets
    if (keyCode === 219) {
      event.preventDefault();

      // Curly brace
      if (event.shiftKey) {
        textarea.value = `${first}{  }${last}`;

        // Set cursor
        textarea.selectionStart = start + 2;
      // Square bracket
      } else {
        textarea.value = `${first}[]${last}`;
        textarea.selectionStart = start + 1;
      }
      textarea.selectionEnd = textarea.selectionStart;
    }

    // Quotes
    if (keyCode === 222) {
      event.preventDefault();

      if (event.shiftKey) textarea.value = `${first}""${last}`;
      else textarea.value = `${first}''${last}`;

      textarea.selectionStart = start + 1;
      textarea.selectionEnd = textarea.selectionStart;
    }

    // Enter button
    if (keyCode === 13) {
      event.preventDefault();

      // Get last character
      const char = first.trim().substr(-1);

      switch (char) {
        case '{':
        case '[':
          textarea.value = `${first.trim()}\n  \n${last.trim()}`;
          textarea.selectionStart = (start - (first.length - first.trim().length)) + 3;
          break;
        default:
          textarea.value = `${first}\n${last}`;
          textarea.selectionStart = start + 1;
      }
      textarea.selectionEnd = textarea.selectionStart;
    }
  });

  /**
   * Let user know if textarea code is malformed
   */
  textarea.addEventListener('keyup', (event) => {
    const error = document.querySelector('#left .error');

    try {
      // We are deliberately using eval here since it does all the heavy
      // lifting for us; why build a custom parser when there is one built-in?
      // eslint-disable-next-line no-eval
      eval(event.target.value);
    } catch (e) {
      error.innerHTML = `<span class="error-circle">X</span>${e.message}`;
      return;
    }

    // Reset error message
    error.innerHTML = '';
  });

  /**
   * Keep state with local storage
   */
  const keepState = (event) => {
    const { name } = event.target;

    // Get settings
    let settings = localStorage.getItem('tab1');

    if (!settings) settings = {};
    else settings = JSON.parse(settings);

    // Set item
    settings[name] = event.target.value;
    localStorage.setItem('tab1', JSON.stringify(settings));
  };

  url.addEventListener('blur', keepState);
  method.addEventListener('blur', keepState);
  collection.addEventListener('blur', keepState);
  textarea.addEventListener('blur', keepState);

  /**
   * Restore settings on load
   */
  window.addEventListener('load', () => {
    let settings = localStorage.getItem('tab1');

    if (settings) {
      settings = JSON.parse(settings);

      // Populate collections
      if (settings.collections && settings.collections instanceof Array) {
        settings.collections.forEach((col) => {
          const option = document.createElement('option');
          option.value = col.name;
          option.textContent = col.name;
          collection.appendChild(option);
        });
      }

      // Populate field values
      url.value = settings.url;
      method.value = settings.method;
      collection.value = settings.collection;
      textarea.value = settings.data;
    }
  });
})(window);
