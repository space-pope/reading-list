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
      if (response.ok) location.reload()
    })
  })

  // Delete entry
  document.querySelectorAll('.delete-entry').forEach((button) => {
    button.addEventListener('click', async function () {
      const id = (button as HTMLElement).dataset.id!
      if (confirm('Delete this entry?')) {
        const response = await fetch(`/entries/${id}`, { method: 'DELETE' })
        if (response.ok) location.reload()
      }
    })
  })

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
        showError(err instanceof Error ? err.message : String(err))
      }
    })
  }
})
