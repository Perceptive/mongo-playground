onmessage = (event) => {
  importScripts('highlight.pack.js');

  // eslint-disable-next-line no-restricted-globals
  const result = self.hljs.highlightAuto(event.data);

  postMessage(result.value);
};
