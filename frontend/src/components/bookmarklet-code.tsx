import { Box, Button } from '@mantine/core'

const codeBlock = `(function () {
  var regex = new RegExp('^/event/([A-Za-z0-9]+)$');
  var match = window.location.pathname.match(regex);
  if (!match) {
    window.alert('Could not find event ID');
    return;
  }
  var eventId = match[1];

  var h1 = document.querySelector('h1');
  if (!h1) {
    window.alert('No h1 found');
    return;
  }

  var nodes = [].slice.call(h1.childNodes);
  var eventName = nodes[0] ? nodes[0].textContent : '';
  var dateString = nodes[1] ? nodes[1].textContent : '';

  var table = [].slice
    .call(document.querySelectorAll('table'))
    .filter(function (t) {
      return t.textContent.indexOf('#NameWDL+-+/-PTS1') !== -1;
    })
    .slice(-1)[0];

  if (!table) {
    window.alert('Results table not found');
    return;
  }

  var rows = table.querySelectorAll('tbody tr');
  var results = [];
  var i;

  for (i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll('td');
    if (cells.length < 5) continue;

    var place = parseInt(cells[0].textContent.trim(), 10);
    var name = cells[1].textContent.trim();
    var bubbleclass = cells[1].querySelector('span');

    var played =
      parseInt(cells[2].textContent, 10) +
      parseInt(cells[3].textContent, 10) +
      parseInt(cells[4].textContent, 10);

    var faction;

    if (bubbleclass) {
      if (bubbleclass.classList.contains('outcasts')) faction = 'outcasts';
      if (bubbleclass.classList.contains('guild')) faction = 'guild';
      if (bubbleclass.classList.contains('bayou')) faction = 'bayou';
      if (bubbleclass.classList.contains('arcanists')) faction = 'arcanists';
      if (bubbleclass.classList.contains('explorers')) faction = 'explorers';
      if (bubbleclass.classList.contains('neverborn')) faction = 'neverborn';
      if (bubbleclass.classList.contains('thunders')) faction = 'explorers';
      if (bubbleclass.classList.contains('resurrectionists')) faction = 'resurrectionists';
    }

    results.push({
      place: place,
      name: name,
      faction: faction,
      played: played
    });
  }

  var json = JSON.stringify(
    {
      eventId: eventId,
      eventName: eventName,
      dateString: dateString,
      results: results
    },
    null,
    2
  );

  navigator.clipboard.writeText(json);
  window.alert('copied event data for ' + eventName + 'to clipboard');
})();`

const bookmarkletCode = 'javascript:' + encodeURIComponent(codeBlock)

export const BookmarkletCode = () => {
  return (
    <Box>
      <Button
        component="a"
        draggable
        onDragStart={(e) => {
          e.currentTarget.setAttribute('href', bookmarkletCode)
        }}
        onClick={(e) => e.preventDefault()}
      >
        📌 Drag to bookmarks
      </Button>
      <details>
        <summary>See the code</summary>
        <pre>
          <code
            style={{
              border: '1px solid black',
              padding: '8px',
              display: 'block',
              overflow: 'scroll',
              maxHeight: '400px',
              textWrap: 'wrap',
              wordBreak: 'break-word',
            }}
          >
            {codeBlock}
          </code>
        </pre>
      </details>
    </Box>
  )
}
