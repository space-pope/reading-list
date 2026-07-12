interface FetchResult {
  url: string
  title: string
  excerpt: string
  fetch_time_ms: number
}

interface EntryResponse {
  id: number | null
  url: string
  title: string
  excerpt: string
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

  // Add form - initial cancel button (clears URL input)
  const initialCancelBtnEl = document.getElementById('initialCancelBtn')
  if (initialCancelBtnEl) {
    initialCancelBtnEl.addEventListener('click', function () {
      const urlInput = document.getElementById('url') as HTMLInputElement
      if (urlInput) urlInput.value = ''
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
        const excerptInput = document.getElementById('excerpt') as HTMLTextAreaElement
        if (titleInput) titleInput.value = data.title || ''
        if (excerptInput) excerptInput.value = data.excerpt || ''
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

  // Add form - cancel button
  const cancelBtnEl = document.getElementById('cancelBtn')
  if (cancelBtnEl) {
    cancelBtnEl.addEventListener('click', function () {
      const addForm = document.getElementById('addForm')
      const saveForm = document.getElementById('saveForm')
      if (addForm) addForm.style.display = 'block'
      if (saveForm) saveForm.style.display = 'none'
    })
  }

  // Add form - save button
  const saveFormEl = document.getElementById('saveForm')
  if (saveFormEl) {
    saveFormEl.addEventListener('submit', async function (e) {
      e.preventDefault()
      const url = (document.getElementById('url') as HTMLInputElement).value
      const title = (document.getElementById('title') as HTMLInputElement).value
      const excerpt = (document.getElementById('excerpt') as HTMLTextAreaElement).value

      let errorDiv = document.getElementById('error')
      if (errorDiv) errorDiv.style.display = 'none'

      try {
        const response = await fetch('/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title, excerpt }),
        })

        if (!response.ok) {
          const data = (await response.json()) as ApiError
          throw new Error(data.error || 'Failed to save')
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
