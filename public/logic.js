(({
  document, localStorage, XMLHttpRequest,
}) => {
  /**
   * Number of results per page
   * @constant
   * @type {number}
   */
  const PAGE_SIZE = 10;

  /**
   * Support for serializing regular expressions to JSON
   */
  // eslint-disable-next-line no-extend-native
  RegExp.prototype.toJSON = function toJSON() {
    const regex = this.toString();
    const $regex = regex.replace(/^\/|\/[gim]{0,3}$/ig, '');
    const $options = regex.match(/\/[gim]{0,3}$/ig)[0].replace('/', '') || undefined;

    return { $regex, $options };
  };

  /**
   * Keep Tabs
   * @type {Map}
   */
  let tabs;

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
   * Interval used for making syntax highlighting feel smoother
   * @type {Interval}
   */
  let interval;

  /**
   * Syntax highlight textarea
   * We actually accomplish this by syntax highlighting over the top
   * of the textarea, but since the section containing the markup
   * has a CSS pointer-events:none; property, the user is none the wiser
   * @param {Event} event
   */
  const highlightTextarea = (textarea, prettySection, worker) => (event) => {
    const keyCode = event.keyCode || event.which;

    // Ignore certain key codes
    if (keyCode === 16 // shift
      || keyCode === 17 // control
      || keyCode === 18 // option
      || keyCode === 20 // caps lock
      || keyCode === 37 // left arrow
      || keyCode === 38 // up arrow
      || keyCode === 39 // right arrow
      || keyCode === 40 // down arrow
      || keyCode === 91 // command/windows key
      || keyCode === 93 // command/windows key (right side)
    ) return;

    // Reset interval to prevent duplicate executions
    clearInterval(interval);

    // Hide highlighting
    prettySection.classList.add('hide');

    // Show textarea text
    textarea.classList.remove('hideText');

    // Interval, even of zero, makes highlighting smooth
    interval = setInterval(() => {
      // Start highlight processing
      worker.postMessage(textarea.value);

      // Hide textarea text
      textarea.classList.add('hideText');

      // Show highlighting
      prettySection.classList.remove('hide');

      clearInterval(interval);
    }, 0);
  };

  /**
   * Handle form submission
   */
  const submitForm = tabName => (event) => {
    event.preventDefault();

    const form = document.querySelector(`#${tabName} form`);

    // We use eval here since it's the only way to convert textarea
    // value into JavaScript given that the value may not be proper
    // JSON and formatting a JavaScript object into proper JSON is
    // a huge pain.
    const query = document.querySelector(`#${tabName} textarea`).value;
    let data = '';
    let hack = false;

    // No need to eval an empty string
    if (query) {
      try {
        // At the same time, eval ignores objects so wrap in array just for op
        // eslint-disable-next-line no-eval
        data = eval(`[${query}]`);
        hack = true;
      } catch (e) {
        // eslint-disable-next-line no-eval
        data = eval(query);
      }
    }

    // Prepare body data
    let body = {
      url: form.url.value,
      method: form.method.value,
      collection: form.collection.value,
      data: hack ? data[0] : data,
    };

    if (!body.url || !body.method || !body.collection) return;

    // Show loading spinner
    const loader = document.querySelector(`#${tabName} .loader`);
    const play = document.querySelector(`#${tabName} .execute .play`);

    play.classList.add('hide');
    loader.classList.remove('hide');

    body = JSON.stringify(body);

    // Send data
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/', true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Handle response
    xhr.addEventListener('readystatechange', function handleResponse() {
      const response = document.querySelector(`#${tabName} .response`);

      if (this.readyState === 4) {
        // Hide loading spinner
        loader.classList.add('hide');
        play.classList.remove('hide');

        const result = this.response;
        const pagination = form.parentElement.querySelector('.pagination');

        if (result && result instanceof Array && result.length > PAGE_SIZE) {
          let updateView;

          let pageSize = PAGE_SIZE;

          // Update response text
          const changeResults = (start = 0, e) => {
            const end = e || Math.min(Number(start) + pageSize, result.length);
            response.innerHTML = syntaxHighlight(result.slice(start, end));
          };

          // Create pagination slider
          const createSlider = (useSlider = true) => {
            // Let user know about selected value
            const output = document.createElement('output');
            output.textContent = `Showing results 0 to ${useSlider ? Math.min(pageSize, result.length) : result.length}`;
            pagination.appendChild(output);

            // If there requests a slider
            if (useSlider) {
              const slider = document.createElement('input');
              slider.type = 'range';
              slider.step = pageSize;
              slider.min = 0;
              slider.value = 0;
              slider.max = result.length;
              slider.classList.add('slider');

              slider.addEventListener('input', () => {
                const start = Number(slider.value);
                const end = Math.min(start + pageSize, result.length);
                output.textContent = `Showing results ${start} to ${end}`;
              });

              // Enable changing results
              slider.addEventListener('change', ({ target }) => changeResults(target.value));

              // Add to page
              pagination.appendChild(slider);
            }
          };

          // Create view some/all buttons
          const createViewButtons = () => {
            const view = document.createElement('aside');
            view.classList.add('view-settings');
            view.innerHTML = `
              <label>
                <input type="radio" name="view-settings" value="view-some">
                View <input type="number" min="0" max="${result.length}"
                  value="${pageSize}" step="${pageSize}">
              </label>
              <label>
                <input type="radio" name="view-settings" value="view-all">
                View All
              </label>
            `;

            // Monitor radio selection
            view.querySelectorAll('input[type="radio"]').forEach(radio => radio
              .addEventListener('change', ({ target }) => {
                switch (target.value) {
                  case 'view-some':
                    pageSize = Number(target.parentElement
                      .querySelector('input[type="number"]').value);
                    updateView();
                    break;
                  case 'view-all':
                    updateView(false, true); // don't include slider
                    break;
                  default:
                }
              }));

            // Monitor page size change
            view.querySelector('input[type="number"]').addEventListener('change', ({ target }) => {
              pageSize = Number(target.value);

              // Update view
              updateView();
            });

            // Add to page
            pagination.appendChild(view);
          };

          // Update view
          updateView = (useSlider = true, viewAll = false) => {
            // Clear view
            pagination.innerHTML = '';

            // Add items to page
            createSlider(useSlider);
            createViewButtons();

            // Set response HTML
            if (viewAll) changeResults(0, result.length);
            else changeResults();
          };

          // Setup view
          updateView();
        } else {
          pagination.innerHTML = '';
          response.innerHTML = syntaxHighlight(result);
        }
      }
    });

    xhr.send(body);
  };

  /**
   * Help save user some time in textarea
   * @param {Event} event
   */
  const helpUserWriteQuery = (event) => {
    const textarea = event.target;
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
  };

  /**
   * Let user know if textarea code is malformed
   * @param {Event} event
   */
  const checkTextareaForErrors = tabName => (event) => {
    const error = document.querySelector(`#${tabName} .left .error`);

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
  };

  /**
   * Close an open tab
   * @param {Event} event
   */
  const closeTab = (event) => {
    event.stopPropagation();

    const tab = event.target.parentElement;

    // Remove data object from settings
    tabs.delete(tab.dataset.tabName);

    // Commit change to local storage
    localStorage.setItem('settings', JSON.stringify(
      // LocalStorage doesn't support objects as values and
      // maps can't be stringified, so first convert to array
      { tabs: Array.from(tabs.values()) },
    ));

    // Remove page elements
    document.querySelector(`#${tab.dataset.tabName}`).remove();
    tab.remove();

    // Click next tab
    const next = Array.from(tabs.keys())[tabs.size - 1];
    const nextTab = document.querySelector(`#tabs li[data-tab-name="${next}"]`);
    nextTab.click();
  };

  /**
   * Update tab text
   * @param {Element} tab
   * @param {object} tabData
   */
  const updateTabText = (tab, tabData) => {
    // Create tab close action
    const close = document.createElement('span');
    close.classList.add('close');
    close.textContent = 'X';
    close.title = 'Close tab';
    close.addEventListener('click', closeTab);

    // Apply update
    const thisTab = tab;
    thisTab.textContent = `${tabData.collection} (${tabData.method})`;
    thisTab.appendChild(close);
  };

  /**
   * Query list of collections to aid user when user leaves the URL field
   * @param {Event} event
   */
  const queryCollections = tabName => (event) => {
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
        const tabData = tabs.get(tabName);
        tabData.collections = collections;
        tabData.collection = collections[0].name;
        tabs.set(tabName, tabData);

        // Add to local storage
        localStorage.setItem('settings', JSON.stringify(
          // LocalStorage doesn't support objects as values and
          // maps can't be stringified, so first convert to array
          { tabs: Array.from(tabs.values()) },
        ));

        // Then populate select field
        const collectionInput = document.querySelector(`#${tabName} form [name="collection"]`);
        collectionInput.innerHTML = ''; // Remove existing fields
        collections.forEach((col) => {
          const option = document.createElement('option');
          option.value = col.name;
          option.textContent = col.name;
          collectionInput.appendChild(option);
        });

        // Update tab name with first collection
        const tab = document.querySelector(`#tabs li[data-tab-name="${tabName}"]`);
        updateTabText(tab, tabData);
      }
    });

    xhr.send(body);
  };

  /**
   * Keep state with local storage
   * @param {Event} event
   */
  const keepState = tabName => (event) => {
    const { name } = event.target;

    // Set url, method, and collection all at once
    const urlInput = document.querySelector(`#${tabName} form [name="url"]`);
    const methodInput = document.querySelector(`#${tabName} form [name="method"]`);
    const collectionInput = document.querySelector(`#${tabName} form [name="collection"]`);

    const tabData = tabs.get(tabName);

    tabData[name] = event.target.value;
    tabData.url = urlInput.value;
    tabData.method = methodInput.value;
    tabData.collection = collectionInput.value;

    tabs.set(tabName, tabData);

    localStorage.setItem('settings', JSON.stringify(
      // LocalStorage doesn't support objects as values and
      // maps can't be stringified, so first convert to array
      { tabs: Array.from(tabs.values()) },
    ));

    // Update tab name accordingly
    const tab = document.querySelector(`#tabs li[data-tab-name="${tabName}"]`);
    updateTabText(tab, tabData);
  };

  /**
   * Create a new tab object
   * @param {object} settings
   * @param {string} tabName - Randomly generated name
   * @returns {object}
   */
  const createTab = (settings, tabName) => {
    const tab = {
      url: '',
      method: '',
      collections: [],
      collection: '',
      data: '',
      ...settings,
    };

    // Create tab
    const tabMenu = document.createElement('li');
    tabMenu.dataset.tabName = tabName;
    if (tab.collection) tabMenu.textContent = `${tab.collection} (${tab.method})`;
    else tabMenu.textContent = 'New tab';

    // Create tab close action
    const close = document.createElement('span');
    close.classList.add('close');
    close.textContent = 'X';
    close.title = 'Close tab';
    close.addEventListener('click', closeTab);

    tabMenu.appendChild(close);
    document.querySelector('#tabs ul').appendChild(tabMenu);

    // Create tab container
    const tabElement = document.createElement('section');
    tabElement.classList.add('tab', 'hide');
    tabElement.id = tabName;

    const MONGO_METHODS = [
      'aggregate',
      'bulkWrite',
      'countDocuments',
      'createIndex',
      'createIndexes',
      'deleteMany',
      'deleteOne',
      'distinct',
      'drop',
      'dropIndex',
      'dropIndexes',
      'estimatedDocumentCount',
      'find',
      'findOne',
      'findOneAndDelete',
      'findOneAndReplace',
      'findOneAndUpdate',
      'geoHaystackSearch',
      'indexes',
      'indexExists',
      'indexInformation',
      'insertMany',
      'insertOne',
      'isCapped',
      'listIndexes',
      'mapReduce',
      'options',
      'parallelCollectionScan',
      'reIndex',
      'rename',
      'replaceOne',
      'stats',
      'updateMany',
      'updateOne',
      'watch',
    ];

    tabElement.innerHTML = `
      <form>
        <label>URL: <input type="text" name="url" value="${tab.url}" required></label>
        <label>Method:
          <select name="method" required>
            ${MONGO_METHODS.map(a => `
              <option value="${a}" ${tab.method === a ? 'selected' : ''}>${a}</option>`)}
          </select>
        </label>
        <label>Collection name:
          <select name="collection" required>
            ${tab.collections.map(col => `
              <option value="${col.name}"
                ${tab.collection === col.name ? 'selected' : ''}>
                  ${col.name}
              </option>
            `).join('')}
          </select>
        </label>
      </form>
      <section class="work-area">
        <section class="left">
          <h2>Query to execute:</h2>
          <section>
            <textarea name="data" class="data hideText" autocomplete="off"
              autocorrect="off" autocapitalize="off" spellcheck="false">${tab.data}</textarea>
            <pre class="textarea-highlight"></pre>
          </section>
          <aside class="error"></aside>
        </section>
        <section class="right">
          <h2>Response:</h2>
          <div class="pagination"></div>
          <pre class="response"></pre>
        </section>
        <div class="execute" title="Execute">
          <span class="play">&#x25B6;</span>
          <span class="loader hide"></span>
        </div>
      </section>
    `;

    // Add to page
    document.querySelector('#tab-container').appendChild(tabElement);

    /**
     * Quick references for tab elements
     */
    const urlInput = document.querySelector(`#${tabName} form [name="url"]`);
    const methodInput = document.querySelector(`#${tabName} form [name="method"]`);
    const collectionInput = document.querySelector(`#${tabName} form [name="collection"]`);
    const textarea = document.querySelector(`#${tabName} textarea`);
    const submit = document.querySelector(`#${tabName} .execute`);
    const prettySection = document.querySelector(`#${tabName} .textarea-highlight`);

    /**
     * Web worker used for syntax highlighting
     */
    const worker = new Worker('worker.js');
    worker.onmessage = (event) => { prettySection.innerHTML = event.data; };
    worker.postMessage(textarea.value);

    /**
     * Events
     */

    // Keep persistent state
    urlInput.addEventListener('blur', keepState(tabName));
    methodInput.addEventListener('change', keepState(tabName));
    collectionInput.addEventListener('change', keepState(tabName));
    textarea.addEventListener('blur', keepState(tabName));

    // Check textarea for eval errors
    textarea.addEventListener('keyup', checkTextareaForErrors(tabName));

    // Help with tabs, indenting, and spacing
    textarea.addEventListener('keydown', helpUserWriteQuery);

    // Handle form submission
    submit.addEventListener('click', submitForm(tabName));

    // Update collections when URL is changed
    urlInput.addEventListener('blur', queryCollections(tabName));

    // Handle syntax highlighting for textarea
    textarea.addEventListener('keydown', highlightTextarea(textarea, prettySection, worker));

    // Synchronize scrolling between textarea and syntax highlighting section
    textarea.addEventListener('scroll', (event) => {
      prettySection.scrollTop = event.target.scrollTop;
      prettySection.scrollLeft = event.target.scrollLeft;
    });

    return tab;
  };

  /**
   * Handle clicking tabs
   * @param {Event} event
   */
  const handleTabClick = (event) => {
    const { tabName } = event.target.dataset;

    // Show work area for this tab
    document.querySelectorAll('#tab-container > .tab').forEach((t) => {
      t.classList.add('hide');
      if (t.id === tabName) t.classList.remove('hide');
    });

    // And set this tab active
    document.querySelectorAll('#tabs li').forEach((t) => {
      t.classList.remove('active');
      if (t.dataset.tabName === tabName) t.classList.add('active');
    });
  };

  /**
   * Handle adding a new tab
   */
  const addNewTab = (data = {}, tabName = `tab${Math.random().toString(36).substr(2, 8)}`) => {
    tabs.set(tabName, createTab(data, tabName));

    // Set active by clicking tab
    const tab = document.querySelector(`#tabs li[data-tab-name="${tabName}"]`);
    tab.addEventListener('click', handleTabClick);
    tab.click();
  };
  document.querySelector('#tabs .add').addEventListener('click', addNewTab);

  /**
   * Restore settings and create tabs on load
   */
  window.addEventListener('load', () => {
    let settings = localStorage.getItem('settings');

    tabs = new Map();

    if (settings) {
      settings = JSON.parse(settings).tabs;

      // For each tab
      settings.forEach(data => addNewTab(data));
    } else addNewTab();
  });
})(window);
