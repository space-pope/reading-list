document.addEventListener('DOMContentLoaded', function() {
    // Toggle read/unread
    document.querySelectorAll('.toggle-read').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.dataset.id;
            const read = this.dataset.read === 'true';
            const response = await fetch(`/entries/${id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({read: !read})
            });
            if (response.ok) location.reload();
        });
    });

    // Delete entry
    document.querySelectorAll('.delete-entry').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (confirm('Delete this entry?')) {
                const response = await fetch(`/entries/${id}`, {method: 'DELETE'});
                if (response.ok) location.reload();
            }
        });
    });

    // Add form - fetch button
    const fetchBtn = document.getElementById('fetchBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async function() {
            const url = document.getElementById('url').value;
            if (!url) {
                showError('Please enter a URL');
                return;
            }

            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            loading.style.display = 'block';
            error.style.display = 'none';
            fetchBtn.disabled = true;

            try {
                const response = await fetch('/fetch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `url=${encodeURIComponent(url)}`
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Fetch failed');
                }

                const data = await response.json();
                document.getElementById('title').value = data.title || '';
                document.getElementById('excerpt').value = data.excerpt || '';
                document.getElementById('addForm').style.display = 'none';
                document.getElementById('saveForm').style.display = 'block';
            } catch (err) {
                showError(err.message);
            } finally {
                loading.style.display = 'none';
                fetchBtn.disabled = false;
            }
        });
    }

    // Add form - cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            document.getElementById('addForm').style.display = 'block';
            document.getElementById('saveForm').style.display = 'none';
        });
    }

    // Add form - save button
    const saveForm = document.getElementById('saveForm');
    if (saveForm) {
        saveForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const url = document.getElementById('url').value;
            const title = document.getElementById('title').value;
            const excerpt = document.getElementById('excerpt').value;

            try {
                const response = await fetch('/entries', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({url, title, excerpt})
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save');
                }

                window.location.href = '/';
            } catch (err) {
                showError(err.message);
            }
        });
    }

    function showError(msg) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
});
