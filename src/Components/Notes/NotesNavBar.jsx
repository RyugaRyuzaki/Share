import React from 'react'
import Box from '@mui/material/Box'
import ListSubheader from '@mui/material/ListSubheader'
import {CloseButton, TooltipIconButton} from '../Buttons'
import {setCameraFromParams, addCameraUrlParams, removeCameraUrlParams} from '../CameraControl'
import {addHashParams, removeHashParams} from '../../utils/location'
import useStore from '../../store/useStore'
import {NOTE_PREFIX} from './Notes'
import AddNoteIcon from '../../assets/icons/AddNote.svg'
import BackIcon from '../../assets/icons/Back.svg'
import NextIcon from '../../assets/icons/NavNext.svg'
import PreviousIcon from '../../assets/icons/NavPrev.svg'


/** @return {React.Component} */
export default function NotesNavBar() {
  const notes = useStore((state) => state.notes)
  const isCreateNoteActive = useStore((state) => state.isCreateNoteActive)
  const toggleIsCreateNoteActive = useStore((state) => state.toggleIsCreateNoteActive)
  const selectedNoteId = useStore((state) => state.selectedNoteId)
  const setSelectedNoteId = useStore((state) => state.setSelectedNoteId)
  const selectedNoteIndex = useStore((state) => state.selectedNoteIndex)
  const setSelectedNoteIndex = useStore((state) => state.setSelectedNoteIndex)
  const closeNotes = useStore((state) => state.closeNotes)


  const selectNote = (direction) => {
    const index = direction === 'next' ? selectedNoteIndex + 1 : selectedNoteIndex - 1
    if (index >= 0 && index < notes.length) {
      const note = notes.filter((n) => n.index === index)[0]
      setSelectedNoteId(note.id)
      setSelectedNoteIndex(note.index)
      removeHashParams(window.location, NOTE_PREFIX)
      addHashParams(window.location, NOTE_PREFIX, {id: note.id})
      if (note.url) {
        setCameraFromParams(note.url)
        addCameraUrlParams()
      } else {
        removeCameraUrlParams()
      }
    }
  }


  return (
    <ListSubheader>
      <Box
        sx={{
          'display': 'flex',
          'flexDirection': 'row',
          'justifyContent': 'center',
          'alignItems': 'center',
          '@media (max-width: 900px)': {
            paddingLeft: '12px',
          },
        }}
      >
        {selectedNoteId && !isCreateNoteActive &&
         <TooltipIconButton
           title='Back to the list'
           placement='bottom'
           onClick={() => {
             removeHashParams(window.location, NOTE_PREFIX)
             setSelectedNoteId(null)
           }}
           icon={<BackIcon className='icon-share'/>}
         />
        }
      </Box>
      <Box sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      >
        {(notes && selectedNoteId) && !isCreateNoteActive && notes.length > 1 &&
          <>
            <TooltipIconButton
              title='Previous Note'
              onClick={() => selectNote('previous')}
              icon={<PreviousIcon className='icon-share' color='secondary'/>}
              placement='bottom'
            />
            <TooltipIconButton
              title='Next Note'
              onClick={() => selectNote('next')}
              icon={<NextIcon className='icon-share' color='secondary'/>}
              placement='bottom'
            />
          </>
        }
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
      >

        {!selectedNoteId && (isCreateNoteActive ?
          <TooltipIconButton
            title='Back to the list'
            placement='bottom'
            onClick={toggleIsCreateNoteActive}
            icon={<BackIcon className='icon-share'/>}
            size='medium'
          /> :
          <TooltipIconButton
            title='ADD A NOTE'
            placement='bottom'
            onClick={toggleIsCreateNoteActive}
            icon={<AddNoteIcon className='icon-share' color='secondary'/>}
            size='medium'
          />
        )}
        <CloseButton onClick={closeNotes}/>
      </Box>
    </ListSubheader>
  )
}
