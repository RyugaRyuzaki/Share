import React from 'react'
import {render, fireEvent} from '@testing-library/react'
import {
  mockedUseAuth0,
  mockedUserLoggedIn,
  mockedUserLoggedOut,
} from '../../__mocks__/authentication'
import {OpenModelControlFixture} from './OpenModelControl.fixture'


describe('Open Model Dialog', () => {
  it('Renders a login message if the user is not logged in', () => {
    mockedUseAuth0.mockReturnValue(mockedUserLoggedOut)
    const {getByTestId, getByText} = render(<OpenModelControlFixture/>)
    const openControlButton = getByTestId('control-button-open')
    fireEvent.click(openControlButton)
    const loginTextMatcher = (content, node) => {
      const hasText = (_node) => _node.textContent.includes('Please login to GitHub')
      const nodeHasText = hasText(node)
      const childrenDontHaveText = Array.from(node.children).every(
          (child) => !hasText(child),
      )
      return nodeHasText && childrenDontHaveText
    }

    const loginText = getByText(loginTextMatcher)
    expect(loginText).toBeInTheDocument()
  })


  it('Renders file selector if the user is logged in', async () => {
    mockedUseAuth0.mockReturnValue(mockedUserLoggedIn)
    const {getByTestId} = render(<OpenModelControlFixture/>)
    const openControlButton = getByTestId('control-button-open')
    fireEvent.click(openControlButton)
    const File = getByTestId('openFile')
    const Repository = await getByTestId('openRepository')
    expect(File).toBeInTheDocument()
    expect(Repository).toBeInTheDocument()
  })
})
