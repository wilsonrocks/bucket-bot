import { Box, Button } from '@mantine/core'

const codeBlock =
  "javascript:(function(){table=[...document.querySelectorAll('table')].filter(t=>t.textContent.includes('#NameWDL+-+/-PTS1')).at(-1);rows=table.querySelectorAll('tbody%20tr');output=[];for(const%20row%20of%20rows){const%20cells=row.querySelectorAll('td');const%20place=parseInt(cells[0].textContent.trim());const%20name=cells[1].textContent.trim();const%20bubbleclass=cells[1].querySelector('span');played=parseInt(cells[2].textContent)+parseInt(cells[3].textContent)+parseInt(cells[4].textContent);let%20faction;if(bubbleclass.classList.contains('outcasts'))faction='outcasts';if(bubbleclass.classList.contains('guild'))faction='guild';if(bubbleclass.classList.contains('bayou'))faction='bayou';if(bubbleclass.classList.contains('arcanists'))faction='arcanists';if(bubbleclass.classList.contains('explorers'))faction='explorers';if(bubbleclass.classList.contains('neverborn'))faction='neverborn';if(bubbleclass.classList.contains('thunders'))faction='explorers';if(bubbleclass.classList.contains('resurrectionists'))faction='resurrectionists';output.push({place,name,faction,played})}json=JSON.stringify(output,null,2);navigator.clipboard.writeText(json);window.alert(`copied%20data%20for%20${output.length}%20scores%20to%20clipboard`)})()"

export const BookmarkletCode = () => {
  return (
    <Box>
      <Button
        component="a"
        draggable
        onDragStart={(e) => {
          e.currentTarget.setAttribute('href', codeBlock)
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
