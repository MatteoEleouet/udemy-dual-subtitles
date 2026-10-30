/**
 * Fetches subtitle files for the content script.
 *
 * The VTT files live on Udemy's CDN, a different origin from the page, and a
 * content script's fetch is bound by the page's CORS rules. The worker holds
 * the host permission instead. It only fetches from udemycdn.com, so it cannot
 * be used to reach anything else.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FETCH_VTT') return false;

  let url;
  try {
    url = new URL(message.url);
  } catch {
    sendResponse({ ok: false, error: 'bad url' });
    return false;
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.udemycdn.com')) {
    sendResponse({ ok: false, error: 'refused: not a Udemy CDN file' });
    return false;
  }

  fetch(url.toString())
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sendResponse({ ok: true, text: await response.text() });
    })
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true; // async response
});
