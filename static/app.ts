interface FetchResult {
  url: string
  title: string
  description: string
  fetch_time_ms: number
}

interface EntryResponse {
  id: number | null
  url: string
  title: string
  description: string
  read: boolean
  source_type: string
  created_at: string
  updated_at: string
  tags: string[]
}

interface ApiError {
  error: string
  details?: Record<string, string>
}

interface NoteResponse {
  id: number
  entry_id: number
  content: string
  page_number: string | null
  created_at: string
  updated_at: string
}

function showError(msg: string): void {
  const errorDiv = document.getElementById('error')
  if (errorDiv) {
    errorDiv.textContent = msg
    errorDiv.style.display = 'block'
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Toggle read/unread
  document.querySelectorAll('.toggle-read').forEach((button) => {
    button.addEventListener('click', async function () {
      const id = (button as HTMLElement).dataset.id!
      const read = (button as HTMLElement).dataset.read === 'true'
      const response = await fetch(`/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !read }),
      })
      if (!response.ok) {
        const li = button.closest('li.entry')
        if (li) showErrorInEntry(li, 'Failed to update read status')
        return
      }

      const li = button.closest('li.entry')
      if (!li) return

      // In unread view: remove from DOM (item disappeared)
      const currentView = new URLSearchParams(window.location.search).get('view')
      if (currentView === 'unread') {
        li.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
        li.style.opacity = '0'
        li.style.transform = 'translateX(-10px)'
        setTimeout(() => li.remove(), 150)
        return
      }

      // In all view: update state inline based on server response
      const newReadState = !read
      li.classList.toggle('read', newReadState)
      li.classList.toggle('unread', !newReadState)
      const headline = li.querySelector('.entry-headline a')
      if (headline) {
        if (newReadState) {
          headline.style.textDecoration = 'line-through'
          headline.style.textDecorationColor = 'var(--text-tertiary)'
        } else {
          headline.style.textDecoration = ''
          headline.style.textDecorationColor = ''
        }
      }
      const icon = button.querySelector('i')
      if (icon) {
        icon.className = newReadState ? 'mdi mdi-eye-off' : 'mdi mdi-eye'
      }
      button.setAttribute('data-read', newReadState ? 'true' : 'false')
      button.setAttribute('data-tooltip', newReadState ? 'Mark as unread' : 'Mark as read')
    })
  })

  // Delete entry — inline confirmation
  let activeConfirmBtn: HTMLElement | null = null

  function dismissConfirm(): void {
    if (!activeConfirmBtn) return
    const footer = activeConfirmBtn.parentElement
    if (!footer) return
    const delBtn = footer.querySelector('.delete-entry') as HTMLElement | null
    if (delBtn) {
      delBtn.style.display = ''
      delBtn.disabled = false
    }
    footer.querySelectorAll('.inline-confirm-btn').forEach((el) => el.remove())
    footer.querySelectorAll('.inline-error').forEach((el) => el.remove())
    activeConfirmBtn = null
  }

  function showErrorInEntry(li: HTMLElement, message: string): void {
    const existing = li.querySelector('.inline-error')
    if (existing) existing.remove()
    const errorEl = document.createElement('div')
    errorEl.className = 'inline-error'
    errorEl.textContent = message
    const footer = li.querySelector('.entry-footer')
    if (footer) {
      footer.insertAdjacentElement('afterend', errorEl)
    }
  }

  document.querySelectorAll('.delete-entry').forEach((button) => {
    button.addEventListener('click', async function (e) {
      e.stopPropagation()
      const id = (button as HTMLElement).dataset.id!
      const li = button.closest('li.entry')
      if (!li) return

      button.style.display = 'none'
      button.disabled = true

      const confirmBtn = document.createElement('button')
      confirmBtn.className = 'action-btn inline-confirm-btn'
      confirmBtn.style.display = 'flex'
      confirmBtn.dataset.id = id
      confirmBtn.innerHTML = '<i class="mdi mdi-check" aria-hidden="true"></i>'
      confirmBtn.setAttribute('data-tooltip', 'Confirm delete')
      confirmBtn.setAttribute('aria-label', 'Confirm delete')

      li.querySelector('.entry-footer')!.appendChild(confirmBtn)
      li.querySelector('.inline-cancel')?.remove()

      const cancelBtn = document.createElement('button')
      cancelBtn.className = 'action-btn inline-cancel inline-confirm-btn'
      cancelBtn.style.display = 'flex'
      cancelBtn.innerHTML = '<i class="mdi mdi-close" aria-hidden="true"></i>'
      cancelBtn.setAttribute('data-tooltip', 'Cancel')
      cancelBtn.setAttribute('aria-label', 'Cancel delete')
      li.querySelector('.entry-footer')!.appendChild(cancelBtn)

      activeConfirmBtn = confirmBtn

      confirmBtn.addEventListener('click', async function (e) {
        e.stopPropagation()
        confirmBtn.disabled = true
        cancelBtn.disabled = true
        confirmBtn.innerHTML = '<i class="mdi mdi-dots-horizontal mdi-spin" aria-hidden="true"></i>'

        try {
          const response = await fetch(`/entries/${id}`, { method: 'DELETE' })
          if (response.ok) {
            dismissConfirm()
            li.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
            li.style.opacity = '0'
            li.style.transform = 'translateX(10px)'
            setTimeout(() => li.remove(), 150)
          } else {
            let errorMsg = 'Failed to delete entry'
            try {
              const data = await response.json()
              if (data.error) errorMsg = data.error
            } catch { /* ignore JSON parse errors */ }
            dismissConfirm()
            button.style.display = ''
            button.disabled = false
            if (li) showErrorInEntry(li, errorMsg)
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Network error — could not delete entry'
          dismissConfirm()
          button.style.display = ''
          button.disabled = false
          if (li) showErrorInEntry(li, errMsg)
        }
      })

      cancelBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        dismissConfirm()
        button.style.display = ''
        button.disabled = false
      })
    })
  })

  // Dismiss active confirmation when clicking outside
  document.addEventListener('click', function (e) {
    if (!activeConfirmBtn) return
    if (!activeConfirmBtn.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.inline-confirm-btn')) {
      dismissConfirm()
      const delBtn = document.querySelector('.delete-entry[style*="display: none"]')
      if (delBtn) {
        delBtn.style.display = ''
        delBtn.disabled = false
      }
    }
  })

  // Add form - quick save button (switches to save form without fetching metadata)
  const quickSaveBtnEl = document.getElementById('quickSaveBtn')
  if (quickSaveBtnEl) {
    quickSaveBtnEl.addEventListener('click', function () {
      const addForm = document.getElementById('addForm')
      const saveForm = document.getElementById('saveForm')
      if (addForm) addForm.style.display = 'none'
      if (saveForm) saveForm.style.display = 'block'
    })
  }

  // Add form - initial cancel button (navigates back to main list)
  const initialCancelBtnEl = document.getElementById('initialCancelBtn')
  if (initialCancelBtnEl) {
    initialCancelBtnEl.addEventListener('click', function () {
      window.location.href = '/'
    })
  }

  // Add form - fetch button
  const fetchBtnEl = document.getElementById('fetchBtn')
  if (fetchBtnEl) {
    const fetchBtn = fetchBtnEl as HTMLButtonElement
    fetchBtn.addEventListener('click', async function () {
      const url = (document.getElementById('url') as HTMLInputElement).value
      if (!url) {
        showError('Please enter a URL')
        return
      }

      const loading = document.getElementById('loading')
      const error = document.getElementById('error')
      if (loading) loading.style.display = 'block'
      if (error) error.style.display = 'none'
      fetchBtn.disabled = true

      try {
        const response = await fetch('/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `url=${encodeURIComponent(url)}`,
        })

        if (!response.ok) {
          const data = (await response.json()) as ApiError
          throw new Error(data.error || 'Fetch failed')
        }

        const data = (await response.json()) as FetchResult
        const titleInput = document.getElementById('title') as HTMLInputElement
        const descriptionInput = document.getElementById('description') as HTMLTextAreaElement
        if (titleInput) titleInput.value = data.title || ''
        if (descriptionInput) descriptionInput.value = data.description || ''
        const addForm = document.getElementById('addForm')
        const saveForm = document.getElementById('saveForm')
        if (addForm) addForm.style.display = 'none'
        if (saveForm) saveForm.style.display = 'block'
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err))
      } finally {
        const loading = document.getElementById('loading')
        if (loading) loading.style.display = 'none'
        fetchBtn.disabled = false
      }
    })
  }

  // Add form - cancel button (navigates back to main list)
  const cancelBtnEl = document.getElementById('cancelBtn')
  if (cancelBtnEl) {
    cancelBtnEl.addEventListener('click', function () {
      window.location.href = '/'
    })
  }

  // Add form - save button
  const saveFormEl = document.getElementById('saveForm')
  if (saveFormEl) {
    saveFormEl.addEventListener('submit', async function (e) {
      e.preventDefault()
      const url = (document.getElementById('url') as HTMLInputElement).value
      const title = (document.getElementById('title') as HTMLInputElement).value
      const description = (document.getElementById('description') as HTMLTextAreaElement).value

      let errorDiv = document.getElementById('error')
      if (errorDiv) errorDiv.style.display = 'none'

      try {
        const response = await fetch('/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title, description }),
        })

        if (!response.ok) {
          const data = (await response.json()) as ApiError
          throw new Error(data.error || 'Failed to save')
        }

        if (errorDiv) {
          errorDiv.textContent = ''
          errorDiv.style.display = 'none'
          void errorDiv.offsetWidth
        }
        window.location.href = '/'
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err instanceof Error ? err.message : String(err)
          errorDiv.style.display = 'block'
        }
      }
    })
  }

  // Inline editing for description fields in entry list
  let activeEditEntryId: number | null = null
  let activeEditTextarea: HTMLTextAreaElement | null = null

  function dismissInlineEdit(): void {
    if (activeEditEntryId === null || !activeEditTextarea) return
    activeEditEntryId = null
    activeEditTextarea = null
  }

  function setupInlineEdit(descriptionEl: HTMLElement): void {
    descriptionEl.addEventListener('click', function (e) {
      // Don't open edit if clicking inside an already-open edit area
      if ((e.target as HTMLElement).closest('.entry-description--editable') ||
          (e.target as HTMLElement).closest('.inline-edit-actions') ||
          (e.target as HTMLElement).closest('.entry-tags') ||
          (e.target as HTMLElement).closest('.tag-btn')) {
        return
      }

      // Cancel any active edit on another entry
      if (activeEditEntryId !== null) {
        dismissInlineEdit()
      }

      const entryLi = descriptionEl.closest('li.entry')
      if (!entryLi) return

      const entryId = parseInt(entryLi.dataset.id || '0', 10)
      const originalText = descriptionEl.textContent || ''

      // Replace text content with textarea
      const textarea = document.createElement('textarea')
      textarea.className = 'entry-description entry-description--editable'
      textarea.value = originalText
      textarea.setAttribute('aria-label', 'Edit description')

      const actionsDiv = document.createElement('div')
      actionsDiv.className = 'inline-edit-actions'

      const saveBtn = document.createElement('button')
      saveBtn.type = 'button'
      saveBtn.className = 'inline-edit-save action-btn inline-confirm-btn'
      saveBtn.innerHTML = '<i class="mdi mdi-check" aria-hidden="true"></i>'
      saveBtn.setAttribute('data-tooltip', 'Save changes')
      saveBtn.setAttribute('aria-label', 'Save changes')

      const cancelBtn = document.createElement('button')
      cancelBtn.type = 'button'
      cancelBtn.className = 'inline-edit-cancel action-btn inline-confirm-btn'
      cancelBtn.innerHTML = '<i class="mdi mdi-close" aria-hidden="true"></i>'
      cancelBtn.setAttribute('data-tooltip', 'Discard changes')
      cancelBtn.setAttribute('aria-label', 'Discard changes')

      actionsDiv.appendChild(saveBtn)
      actionsDiv.appendChild(cancelBtn)

      descriptionEl.replaceWith(textarea, actionsDiv)

      activeEditEntryId = entryId
      activeEditTextarea = textarea
      textarea.focus()
      textarea.select()

      // Save action
      saveBtn.addEventListener('click', async function (e) {
        e.stopPropagation()
        const newValue = textarea.value
        const saveIcon = saveBtn.querySelector('i')
        saveBtn.disabled = true
        if (saveIcon) {
          saveIcon.className = 'mdi mdi-dots-horizontal mdi-spin'
        }

        // Client-side validation
        if (newValue.length > 2000) {
          const errorDiv = document.createElement('div')
          errorDiv.className = 'inline-edit-error'
          errorDiv.textContent = 'Description must be 2000 characters or less'
          actionsDiv.parentNode!.insertBefore(errorDiv, actionsDiv.nextSibling)
          saveBtn.disabled = false
          if (saveIcon) {
            saveIcon.className = 'mdi mdi-check'
          }
          return
        }

        // Remove existing inline error if any
        const existingError = actionsDiv.parentNode?.querySelector('.inline-edit-error')
        if (existingError) existingError.remove()

        try {
          const response = await fetch(`/entries/${entryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newValue }),
          })

          if (!response.ok) {
            let errorMsg = 'Failed to save description'
            try {
              const data = await response.json()
              if (data.error) errorMsg = data.error
            } catch { /* ignore JSON parse errors */ }

            const errorDiv = document.createElement('div')
            errorDiv.className = 'inline-edit-error'
            errorDiv.textContent = errorMsg
            actionsDiv.parentNode!.insertBefore(errorDiv, actionsDiv.nextSibling)
            saveBtn.disabled = false
            if (saveIcon) {
              saveIcon.className = 'mdi mdi-check'
            }
            return
          }

          // Success: restore as plain text
          const para = document.createElement('p')
          para.className = descriptionEl.className
          para.textContent = newValue
          para.dataset.originalText = newValue
          actionsDiv.parentNode!.replaceChild(para, actionsDiv)
          textarea.parentNode!.replaceChild(para, textarea)
          dismissInlineEdit()
          setupInlineEdit(para)
        } catch {
          const errorDiv = document.createElement('div')
          errorDiv.className = 'inline-edit-error'
          errorDiv.textContent = 'Network error — could not save description'
          actionsDiv.parentNode!.insertBefore(errorDiv, actionsDiv.nextSibling)
          saveBtn.disabled = false
          if (saveIcon) {
            saveIcon.className = 'mdi mdi-check'
          }
        }
      })

      // Cancel action
      cancelBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        const para = document.createElement('p')
        para.className = descriptionEl.className
        para.textContent = originalText
        para.dataset.originalText = originalText
        actionsDiv.parentNode!.replaceChild(para, actionsDiv)
        textarea.parentNode!.replaceChild(para, textarea)
        dismissInlineEdit()
        setupInlineEdit(para)
      })

      // Escape key cancels
      textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault()
          const para = document.createElement('p')
          para.className = descriptionEl.className
          para.textContent = originalText
          para.dataset.originalText = originalText
          actionsDiv.parentNode!.replaceChild(para, actionsDiv)
          textarea.parentNode!.replaceChild(para, textarea)
          dismissInlineEdit()
          setupInlineEdit(para)
        }
      })
    })
  }

  // Set up inline editing on all description elements
  document.querySelectorAll('.entry-description').forEach((el) => {
    setupInlineEdit(el as HTMLElement)
  })

  // Note count badge updates
  function refreshNoteCount(entryId: string): void {
    fetch(`/entries/${entryId}/notes`)
      .then((r) => r.json() as Promise<NoteResponse[]>)
      .then((notes) => {
        const entryLi = document.querySelector(`li.entry[data-entry-id="${entryId}"]`)
        if (!entryLi) return
        let badge = entryLi.querySelector('.note-count') as HTMLElement | null
        if (!notes.length) {
          if (!badge) {
            badge = document.createElement('span')
            badge.className = 'note-count'
            badge.setAttribute('data-entry-id', entryId)
            const meta = entryLi.querySelector('.entry-meta')
            if (meta) meta.appendChild(badge)
          }
          badge.setAttribute('aria-label', `0 notes`)
          badge.textContent = '0 notes'
          return
        }
        if (!badge) {
          badge = document.createElement('span')
          badge.className = 'note-count'
          badge.setAttribute('data-entry-id', entryId)
          const meta = entryLi.querySelector('.entry-meta')
          if (meta) meta.appendChild(badge)
          else return
        }
        const count = notes.length
        badge.setAttribute('aria-label', `${count} note${count > 1 ? 's' : ''}`)
        badge.textContent = `${count} note${count > 1 ? 's' : ''}`
      })
      .catch(() => {})
  }

  // Notes panel — toggle, add, delete
  document.querySelectorAll('.toggle-notes').forEach((button) => {
    button.addEventListener('click', function () {
      const id = (button as HTMLElement).dataset.id!
      const panel = document.querySelector(`.notes-panel[data-entry-id="${id}"]`) as HTMLElement | null
      if (!panel) return
      const isOpen = !panel.classList.contains('hidden')

      // Close all other panels
      document.querySelectorAll('.notes-panel:not(.hidden)').forEach((p) => {
        p.classList.add('hidden')
      })
      document.querySelectorAll('.toggle-notes').forEach((b) => {
        (b as HTMLElement).querySelector('i')!.className = 'mdi mdi-clipboard-text'
      })

      if (isOpen) {
        panel.classList.add('hidden')
        return
      }

      panel.classList.remove('hidden')
      const icon = button.querySelector('i')
      if (icon) icon.className = 'mdi mdi-clipboard-text-check'

      loadNotes(panel, id)

      // Close button
      const closeBtn = panel.querySelector('.notes-close') as HTMLElement | null
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          panel.classList.add('hidden')
          if (icon) icon.className = 'mdi mdi-clipboard-text'
        })
      }
    })
  })

  async function loadNotes(panel: HTMLElement, entryId: string): Promise<void> {
    const listEl = panel.querySelector('.notes-list') as HTMLElement | null
    const formEl = panel.querySelector('.notes-add-form') as HTMLElement | null
    if (!listEl || !formEl) return

    try {
      const response = await fetch(`/entries/${entryId}/notes`)
      if (!response.ok) {
        listEl.innerHTML = '<li class="notes-empty">Failed to load notes</li>'
        return
      }
      const notes = await response.json() as NoteResponse[]

      if (!notes.length) {
        listEl.innerHTML = '<li class="notes-empty">No notes yet</li>'
        formEl.style.display = 'block'
        return
      }

      listEl.innerHTML = notes.map((note) => {
        const metaParts: string[] = []
        if (note.page_number) metaParts.push(`p. ${note.page_number}`)
        if (note.created_at) metaParts.push(note.created_at.slice(0, 10))
        const meta = metaParts.length ? `<span class="note-meta">${metaParts.join(' · ')}</span>` : ''
        const isLong = note.content.length > 200
        return `<li data-note-id="${note.id}" data-note-page="${note.page_number ?? ''}">
          <div class="note-body">
            <div class="note-text">${escapeHtml(note.content)}</div>
            ${meta ? `<div class="note-meta-row">
              <span class="note-meta-label">${meta}</span>
              <span class="note-delete-group">
                <button class="note-edit-trigger" data-note-id="${note.id}" aria-label="Edit note" title="Edit note"><i class="mdi mdi-pencil-outline"></i></button>
                <button class="note-delete-trigger" data-note-id="${note.id}" aria-label="Delete note" title="Delete note"><i class="mdi mdi-delete-outline"></i></button>
              </span>
            </div>` : `<div class="note-meta-row">
              <span></span>
              <span class="note-delete-group">
                <button class="note-edit-trigger" data-note-id="${note.id}" aria-label="Edit note" title="Edit note"><i class="mdi mdi-pencil-outline"></i></button>
                <button class="note-delete-trigger" data-note-id="${note.id}" aria-label="Delete note" title="Delete note"><i class="mdi mdi-delete-outline"></i></button>
              </span>
            </div>`}
            ${isLong ? `<button class="note-expand" aria-label="Show full note">show more</button>` : ''}
          </div>
        </li>`
      }).join('')

      formEl.style.display = 'block'

      // Delete handlers — inline confirm/cancel flow
      let activeNoteDeleteBtn: HTMLElement | null = null
      let activeNoteConfirmBtn: HTMLElement | null = null

      function dismissNoteConfirm(): void {
        if (!activeNoteDeleteBtn || !activeNoteConfirmBtn) return
        const parent = activeNoteConfirmBtn.parentNode
        if (!parent) return
        const confirmBtn = parent.querySelector('.note-confirm-btn') as HTMLElement | null
        const cancelBtn = parent.querySelector('.note-cancel') as HTMLElement | null
        if (confirmBtn) confirmBtn.remove()
        if (cancelBtn) cancelBtn.remove()
        if (activeNoteDeleteBtn) {
          (activeNoteDeleteBtn as HTMLElement).style.display = ''
        }
        activeNoteDeleteBtn = null
        activeNoteConfirmBtn = null
      }

      listEl.querySelectorAll('.note-delete-trigger').forEach((trigger) => {
        trigger.addEventListener('click', async function (e) {
          e.stopPropagation()
          const noteId = (trigger as HTMLElement).dataset.noteId!
          const li = (trigger as HTMLElement).closest('li')
          if (!li) return

          trigger.style.display = 'none'

          const confirmBtn = document.createElement('button')
          confirmBtn.className = 'note-confirm-btn'
          confirmBtn.innerHTML = '<i class="mdi mdi-check" aria-hidden="true"></i> yes'
          confirmBtn.setAttribute('aria-label', 'Confirm delete')

          const cancelBtn = document.createElement('button')
          cancelBtn.className = 'note-cancel'
          cancelBtn.innerHTML = '<i class="mdi mdi-close" aria-hidden="true"></i> cancel'
          cancelBtn.setAttribute('aria-label', 'Cancel delete')

          const group = trigger.closest('.note-delete-group')
          if (group) {
            group.appendChild(confirmBtn)
            group.appendChild(cancelBtn)
          }

          activeNoteDeleteBtn = trigger
          activeNoteConfirmBtn = confirmBtn

          confirmBtn.addEventListener('click', async function (e2) {
            e2.stopPropagation()
            confirmBtn.disabled = true
            cancelBtn.disabled = true
            confirmBtn.innerHTML = '<i class="mdi mdi-dots-horizontal mdi-spin" aria-hidden="true"></i>'

            try {
              const res = await fetch(`/notes/${noteId}`, { method: 'DELETE' })
              if (res.ok) {
                dismissNoteConfirm()
                li.style.transition = 'opacity 0.15s ease'
                li.style.opacity = '0'
                setTimeout(() => {
                  li.remove()
                  const remaining = listEl.querySelectorAll('li:not(.notes-empty)')
                  if (!remaining.length) {
                    listEl.innerHTML = '<li class="notes-empty">No notes yet</li>'
                  }
                }, 150)
                refreshNoteCount(entryId)
              } else {
                dismissNoteConfirm()
                trigger.style.display = ''
              }
            } catch {
              dismissNoteConfirm()
              trigger.style.display = ''
            }
          })

          cancelBtn.addEventListener('click', function (e2) {
            e2.stopPropagation()
            dismissNoteConfirm()
          })
        })
      })

      // Expand/collapse long notes
      listEl.querySelectorAll('.note-expand').forEach((expandBtn) => {
        expandBtn.addEventListener('click', function () {
          const li = (expandBtn as HTMLElement).closest('li')
          if (!li) return
          const textEl = li.querySelector('.note-text') as HTMLElement | null
          if (!textEl) return
          const isExpanded = textEl.classList.contains('expanded')
          if (isExpanded) {
            textEl.classList.remove('expanded')
            (expandBtn as HTMLElement).textContent = 'show more'
          } else {
            textEl.classList.add('expanded')
            (expandBtn as HTMLElement).textContent = 'show less'
          }
        })
      })

      // Edit handlers
      let activeNoteEditBtn: HTMLElement | null = null
      let activeNoteEditLi: HTMLElement | null = null

      function dismissNoteEdit(): void {
        if (!activeNoteEditLi) return
        loadNotes(panel, entryId)
        activeNoteEditBtn = null
        activeNoteEditLi = null
      }

      listEl.querySelectorAll('.note-edit-trigger').forEach((editBtn) => {
        editBtn.addEventListener('click', function () {
          if (activeNoteEditBtn) {
            dismissNoteEdit()
            return
          }
          const li = (editBtn as HTMLElement).closest('li')
          if (!li) return
          const noteId = (editBtn as HTMLElement).dataset.noteId!
          const textEl = li.querySelector('.note-text') as HTMLElement | null
          const metaRow = li.querySelector('.note-meta-row') as HTMLElement | null
          const expandBtn = li.querySelector('.note-expand') as HTMLElement | null
          if (!textEl) return

          activeNoteEditBtn = editBtn as HTMLElement
          activeNoteEditLi = li

          const originalText = li.dataset.notePage ?? ''
          const textarea = document.createElement('textarea')
          textarea.className = 'notes-textarea note-edit-textarea'
          textarea.value = textEl.textContent || ''
          textarea.rows = 3

          textEl.style.display = 'none'
          textEl.after(textarea)

          if (expandBtn) {
            expandBtn.style.display = 'none'
          }

          const editPageInput = document.createElement('input')
          editPageInput.type = 'text'
          editPageInput.className = 'notes-page-input note-edit-page-input'
          editPageInput.placeholder = 'Page (optional)'
          editPageInput.maxLength = 50
          editPageInput.value = originalText

          const saveBtn = document.createElement('button')
          saveBtn.className = 'note-edit-save'
          saveBtn.textContent = 'Save'
          saveBtn.setAttribute('aria-label', 'Save note')

          const cancelBtn = document.createElement('button')
          cancelBtn.className = 'note-edit-cancel'
          cancelBtn.textContent = 'Cancel'
          cancelBtn.setAttribute('aria-label', 'Cancel edit')

          if (metaRow) {
            const deleteGroup = metaRow.querySelector('.note-delete-group')
            const label = metaRow.querySelector('.note-meta-label')
            if (label && deleteGroup) {
              deleteGroup.remove()
              label.replaceWith(editPageInput)
              metaRow.appendChild(saveBtn)
              metaRow.appendChild(cancelBtn)
            } else if (label) {
              label.replaceWith(editPageInput)
              metaRow.appendChild(saveBtn)
              metaRow.appendChild(cancelBtn)
            } else if (deleteGroup) {
              deleteGroup.remove()
              metaRow.appendChild(editPageInput)
              metaRow.appendChild(saveBtn)
              metaRow.appendChild(cancelBtn)
            } else {
              metaRow.appendChild(editPageInput)
              metaRow.appendChild(saveBtn)
              metaRow.appendChild(cancelBtn)
            }
          } else {
            const metaRowNew = document.createElement('div')
            metaRowNew.className = 'note-meta-row'
            metaRowNew.appendChild(editPageInput)
            metaRowNew.appendChild(saveBtn)
            metaRowNew.appendChild(cancelBtn)
            li.querySelector('.note-body')!.appendChild(metaRowNew)
          }

          textarea.focus()

          saveBtn.addEventListener('click', async function (e) {
            e.stopPropagation()
            saveBtn.disabled = true
            cancelBtn.disabled = true
            saveBtn.textContent = ''
            saveBtn.innerHTML = '<i class="mdi mdi-dots-horizontal mdi-spin" aria-hidden="true"></i>'

            const newContent = textarea.value.trim()
            const newPage = editPageInput.value.trim() || null

            if (!newContent) {
              textarea.focus()
              saveBtn.disabled = false
              cancelBtn.disabled = false
              saveBtn.textContent = 'Save'
              return
            }

            try {
              const res = await fetch(`/notes/${noteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent, page_number: newPage }),
              })
              if (res.ok) {
                dismissNoteEdit()
              } else {
                saveBtn.disabled = false
                cancelBtn.disabled = false
                saveBtn.textContent = 'Save'
              }
            } catch {
              saveBtn.disabled = false
              cancelBtn.disabled = false
              saveBtn.textContent = 'Save'
            }
          })

          cancelBtn.addEventListener('click', function (e) {
            e.stopPropagation()
            dismissNoteEdit()
          })
        })
      })
    } catch {
      listEl.innerHTML = '<li class="notes-empty">Failed to load notes</li>'
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Notes add form submit
  document.querySelectorAll('.notes-add-form').forEach((form) => {
    form.addEventListener('submit', async function (e) {
      e.preventDefault()
      const panel = (form as HTMLElement).closest('.notes-panel') as HTMLElement | null
      if (!panel) return
      const entryId = panel.dataset.entryId!
      const textarea = form.querySelector('.notes-textarea') as HTMLTextAreaElement | null
      const pageInput = form.querySelector('.notes-page-input') as HTMLInputElement | null
      if (!textarea) return

      const content = textarea.value.trim()
      if (!content) {
        textarea.focus()
        return
      }

      const pageValue = pageInput?.value.trim() || null
      const addBtn = form.querySelector('.notes-add-btn') as HTMLButtonElement | null
      if (addBtn) {
        addBtn.disabled = true
        addBtn.textContent = '...'
      }

      try {
        const response = await fetch('/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_id: parseInt(entryId, 10), content, page_number: pageValue }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || 'Failed to add note')
        }

        textarea.value = ''
        if (pageInput) pageInput.value = ''

        const listEl = panel.querySelector('.notes-list') as HTMLElement | null
        if (listEl) {
          const existingEmpty = listEl.querySelector('.notes-empty')
          if (existingEmpty) existingEmpty.remove()
        }

        // Reload to get full note data
        await loadNotes(panel, entryId)

        // Update note count badge
        refreshNoteCount(entryId)

        // Re-enable buttons
        if (addBtn) {
          addBtn.disabled = false
          addBtn.textContent = 'Add'
        }
      } catch {
        // Keep the content in the textarea so user can retry
      } finally {
        if (addBtn) {
          addBtn.disabled = false
          addBtn.textContent = 'Add'
        }
      }
    })
  })

  // Tag input — open on tag icon click
  async function openTagDropdown(entryId: number): Promise<void> {
    const entryLi = document.querySelector(`li.entry[data-entry-id="${entryId}"]`)
    if (!entryLi) return

    const tagBtn = entryLi.querySelector('.tag-btn') as HTMLElement | null
    if (!tagBtn) return

    // Remove existing dropdown if open
    const existing = document.querySelector('.tag-dropdown')
    if (existing) existing.remove()

    const entryTags = (entryLi.dataset.currentTags ? JSON.parse(entryLi.dataset.currentTags) : []) as string[]
    const res = await fetch('/tags').catch(() => null)
    const allTags: Array<{ id: number; name: string }> = res?.ok ? await res.json() : []

    const rect = tagBtn.getBoundingClientRect()
    const wrapper = document.createElement('div')
    wrapper.className = 'tag-dropdown'
    wrapper.style.left = `${rect.left}px`
    wrapper.style.top = `${rect.bottom + 4}px`

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'tag-dropdown-input'
    input.placeholder = 'Add a tag...'
    input.setAttribute('aria-label', 'Add a tag')

    const datalistId = `tag-datalist-${entryId}`
    input.setAttribute('list', datalistId)

    const datalist = document.createElement('datalist')
    datalist.id = datalistId

    for (const tag of allTags) {
      if (!entryTags.includes(tag.name.toLowerCase())) {
        const option = document.createElement('option')
        option.value = tag.name
        datalist.appendChild(option)
      }
    }

    wrapper.appendChild(input)
    wrapper.appendChild(datalist)
    document.body.appendChild(wrapper)
    input.focus()

    let wrapperRemoved = false

    const remove = () => {
      if (!wrapperRemoved) {
        wrapperRemoved = true
        if (wrapper.parentNode) {
          wrapper.remove()
        }
      }
    }

    // onchange fires when the user confirms their value (Enter, selects from datalist, or blur with changed value)
    input.onchange = () => {
      const tagName = input.value.trim()
      if (tagName) {
        addTagToEntry(entryId, tagName)
      }
      remove()
    }

    // blur fires when focus leaves — removes the dropdown
    input.onblur = () => {
      remove()
    }

    // Enter submits the tag; Escape closes without adding
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const tagName = input.value.trim()
        if (tagName) {
          addTagToEntry(entryId, tagName)
        }
        remove()
        return
      }
      if (e.key === 'Escape') {
        remove()
        return
      }
    }

    // Click outside also closes
    const handleClickOutside = (e: MouseEvent) => {
      if (!wrapperRemoved && !wrapper.contains(e.target as Node) && !tagBtn.contains(e.target as Node)) {
        remove()
        document.removeEventListener('click', handleClickOutside)
      }
    }
    requestAnimationFrame(() => {
      document.addEventListener('click', handleClickOutside)
    })
  }

  async function addTagToEntry(entryId: number, tagName: string): Promise<void> {
    const entryLi = document.querySelector(`li.entry[data-entry-id="${entryId}"]`)
    if (!entryLi) return
    const entryIdNum = parseInt(entryLi.dataset.entryId || '0', 10)
    const currentTags = (entryLi.dataset.currentTags ? JSON.parse(entryLi.dataset.currentTags) : []) as string[]
    const normalizedTag = tagName.trim().toLowerCase()
    if (currentTags.includes(normalizedTag)) return

    const newTags = [...currentTags, normalizedTag]
    const entryContent = entryLi.querySelector('.entry-content') as HTMLElement | null
    if (!entryContent) return

    try {
      const response = await fetch(`/entries/${entryIdNum}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errMsg = (data as { error?: string }).error || 'Failed to add tag'
        console.error('addTagToEntry PATCH failed:', response.status, errMsg, { entryIdNum, newTags })
        throw new Error(errMsg)
      }

      const result = (await response.json()) as { tags: string[] }
      entryLi.dataset.currentTags = JSON.stringify(result.tags)

      const params = new URLSearchParams(window.location.search)
      const currentTagFilter = params.get('tag') || ''

      const tagsContainer = entryContent.querySelector('.entry-tags') as HTMLElement | null
      if (tagsContainer) {
        tagsContainer.innerHTML = ''
        for (const tag of result.tags) {
          const tagEl = document.createElement('span')
          const isActive = currentTagFilter.toLowerCase() === tag.toLowerCase()
          tagEl.className = `tag${isActive ? ' tag--active' : ''}`
          tagEl.dataset.tagName = tag
          tagEl.setAttribute('aria-label', tag)
          tagEl.textContent = tag

          const removeBtn = document.createElement('button')
          removeBtn.className = 'tag-remove'
          removeBtn.setAttribute('aria-label', `Remove tag ${tag}`)
          removeBtn.textContent = '×'
          removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await removeTagFromEntry(entryIdNum, tag)
          })
          tagEl.appendChild(removeBtn)
          tagsContainer.appendChild(tagEl)
        }
      }
    } catch {
      showError('Failed to add tag')
    }
  }

  async function removeTagFromEntry(entryId: number, tagName: string): Promise<void> {
    const entryLi = document.querySelector(`li.entry[data-entry-id="${entryId}"]`)
    if (!entryLi) return
    const entryIdNum = parseInt(entryLi.dataset.entryId || '0', 10)
    const currentTags = (entryLi.dataset.currentTags ? JSON.parse(entryLi.dataset.currentTags) : []) as string[]
    const normalizedTag = tagName.trim().toLowerCase()
    const newTags = currentTags.filter((t) => t !== normalizedTag)

    const entryContent = entryLi.querySelector('.entry-content') as HTMLElement | null
    if (!entryContent) return

    try {
      const response = await fetch(`/entries/${entryIdNum}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to remove tag')
      }

      const result = (await response.json()) as { tags: string[] }
      entryLi.dataset.currentTags = JSON.stringify(result.tags)

      const params = new URLSearchParams(window.location.search)
      const currentTagFilter = params.get('tag') || ''

      const tagsContainer = entryContent.querySelector('.entry-tags') as HTMLElement | null
      if (tagsContainer) {
        if (result.tags.length === 0) {
          tagsContainer.remove()
          return
        }
        tagsContainer.innerHTML = ''
        for (const tag of result.tags) {
          const tagEl = document.createElement('span')
          const isActive = currentTagFilter.toLowerCase() === tag.toLowerCase()
          tagEl.className = `tag${isActive ? ' tag--active' : ''}`
          tagEl.dataset.tagName = tag
          tagEl.setAttribute('aria-label', tag)
          tagEl.textContent = tag

          const removeBtn = document.createElement('button')
          removeBtn.className = 'tag-remove'
          removeBtn.setAttribute('aria-label', `Remove tag ${tag}`)
          removeBtn.textContent = '×'
          removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await removeTagFromEntry(entryIdNum, tag)
          })
          tagEl.appendChild(removeBtn)
          tagsContainer.appendChild(tagEl)
        }
      }
    } catch {
      showError('Failed to remove tag')
    }
  }

  // Wire up tag icon click handlers
  document.querySelectorAll('.tag-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const entryId = (btn as HTMLElement).dataset.entryId!
      openTagDropdown(parseInt(entryId, 10))
    })
  })

  // Wire up tag badge delete handlers and filter click handlers
  document.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation()
      const tagEl = (btn as HTMLElement).closest('.tag') as HTMLElement | null
      if (!tagEl) return
      const tagName = tagEl.dataset.tagName || ''
      const entryLi = tagEl.closest('li.entry')
      if (!entryLi) return
      const entryId = parseInt(entryLi.dataset.entryId || '0', 10)
      await removeTagFromEntry(entryId, tagName)
    })
  })

  // Wire up tag badge click for filtering (event delegation — handles dynamically created tags too)
  document.addEventListener('click', async function (e) {
    const tagEl = (e.target as HTMLElement).closest('.tag:not(.tag-remove)')
    if (!tagEl) return
    e.stopPropagation()
    const tagName = (tagEl as HTMLElement).dataset.tagName || ''
    const params = new URLSearchParams(window.location.search)
    const currentTag = params.get('tag')
    if (currentTag && currentTag.toLowerCase() === tagName.toLowerCase()) {
      params.delete('tag')
      const queryString = params.toString()
      window.location.href = queryString ? `/?${queryString}` : '/'
    } else {
      params.set('tag', tagName)
      const queryString = params.toString()
      window.location.href = `/?${queryString}`
    }
  })

  // Initialize current tags dataset on all entries
  document.querySelectorAll('.entry').forEach((entryEl) => {
    const tags: string[] = []
    const tagEls = entryEl.querySelectorAll('.entry-tags .tag')
    tagEls.forEach((t) => {
      const name = (t as HTMLElement).dataset.tagName
      if (name) tags.push(name.toLowerCase())
    })
    entryEl.dataset.currentTags = JSON.stringify(tags)
  })

  // Add form tag input (US3)
  const addFormTags: string[] = []

  function renderAddFormTags(): void {
    const listEl = document.getElementById('addFormTagsList')
    if (!listEl) return
    listEl.innerHTML = ''
    addFormTags.forEach((tag, index) => {
      const li = document.createElement('li')
      li.className = 'add-form-tag-item'
      li.textContent = tag
      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'add-form-tag-remove'
      removeBtn.setAttribute('aria-label', `Remove tag ${tag}`)
      removeBtn.textContent = '×'
      removeBtn.addEventListener('click', () => {
        addFormTags.splice(index, 1)
        renderAddFormTags()
      })
      li.appendChild(removeBtn)
      listEl.appendChild(li)
    })
  }

  const addTagInput = document.getElementById('addTagInput') as HTMLInputElement | null
  const addTagBtn = document.getElementById('addTagBtn') as HTMLButtonElement | null

  function tryAddAddFormTag(): void {
    if (!addTagInput) return
    const tagName = addTagInput.value.trim().toLowerCase()
    if (!tagName || addFormTags.includes(tagName)) return
    addFormTags.push(tagName)
    addTagInput.value = ''
    renderAddFormTags()
  }

  if (addTagBtn) {
    addTagBtn.addEventListener('click', tryAddAddFormTag)
  }

  if (addTagInput) {
    addTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        tryAddAddFormTag()
      }
    })
  }

  // Wire add form save to include tags
  const saveForm = document.getElementById('saveForm') as HTMLFormElement | null
  if (saveForm) {
    saveForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      const url = (document.getElementById('url') as HTMLInputElement).value
      const title = (document.getElementById('title') as HTMLInputElement).value
      const description = (document.getElementById('description') as HTMLTextAreaElement).value

      let errorDiv = document.getElementById('error')
      if (errorDiv) errorDiv.style.display = 'none'

      try {
        const response = await fetch('/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title, description, tags: addFormTags }),
        })

        if (!response.ok) {
          const data = await response.json() as { error?: string }
          throw new Error(data.error || 'Failed to save')
        }

        // Clear tags after successful save
        addFormTags.length = 0
        renderAddFormTags()
        if (errorDiv) {
          errorDiv.textContent = ''
          errorDiv.style.display = 'none'
          void errorDiv.offsetWidth
        }
        window.location.href = '/'
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err instanceof Error ? err.message : String(err)
          errorDiv.style.display = 'block'
        }
      }
    })
  }
})
