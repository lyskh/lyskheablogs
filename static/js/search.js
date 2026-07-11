function displayResults(results, store) {
    const searchResults = document.getElementById('results');
    if (!searchResults) {
        console.error('Search results container is missing in the DOM');
        return;
    }

    if (results.length) {
        let resultList = ''
        for (const key in results) {
            const result = results[key]
            const item = store[result.ref]
            if (!item) {
                continue
            }

            const previewSource = item.description || item.content || ''
            const preview = previewSource.length > 180 ? previewSource.substring(0, 180).trimEnd() + '...' : previewSource
            const categories = Array.isArray(item.categories) && item.categories.length ? item.categories.join(', ') : ''

            resultList += '<div class="card"><a href="' + item.url + '"><div class="text"><h2>' + item.title + '</h2>'
            resultList += '<p class="small">' + preview + '</p>'
            if (categories) {
                resultList += '<p class="small">Topic: ' + categories + '</p>'
            }
            resultList += '</a></div></div>'
        }
        searchResults.innerHTML = resultList
    } else {
        searchResults.innerHTML = 'No results found for that query.'
    }
}

const SEARCH_STORAGE_KEY = 'searchQuery'
const SEARCH_FILTER_STORAGE_KEY = 'searchFilter'

const searchForm = document.getElementById('search')
const searchInput = document.getElementById('search-input')
const filterSelect = document.getElementById('search-filter')
const isSearchPage = window.location.pathname.replace(/\/$/, '') === '/search'

if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
        const queryValue = searchInput.value.trim()
        const filterValue = filterSelect ? filterSelect.value.trim() : ''

        if (!queryValue && !filterValue) {
            return
        }

        event.preventDefault()
        sessionStorage.setItem(SEARCH_STORAGE_KEY, queryValue)
        sessionStorage.setItem(SEARCH_FILTER_STORAGE_KEY, filterValue)
        window.location.href = '/search/'
    })
}

function normalizeQuery(query) {
    return (query || '').trim().replace(/\s+/g, ' ')
}

function getSearchResults(query, filterValue) {
    const normalizedQuery = normalizeQuery(query)
    if (!normalizedQuery && !filterValue) {
        return []
    }

    const idx = lunr(function () {
        this.ref('id')
        this.field('title', {
            boost: 20
        })
        this.field('description', {
            boost: 12
        })
        this.field('content', {
            boost: 10
        })
        this.field('tags', {
            boost: 8
        })
        this.field('categories', {
            boost: 6
        })

        Object.keys(window.store).forEach((key) => {
            const item = window.store[key]
            this.add({
                id: key,
                title: item.title,
                description: item.description || '',
                content: item.content || '',
                tags: (item.tags || []).join(' '),
                categories: (item.categories || []).join(' ')
            })
        })
    })

    let results = idx.search(normalizedQuery || '*')
    results.sort((a, b) => b.score - a.score)

    const excludedUrls = [
        window.location.origin + '/search/',
        window.location.origin + '/search'
    ]

    return results.filter((result) => {
        const item = window.store[result.ref]
        if (!item || !item.url) {
            return false
        }
        if (excludedUrls.includes(item.url)) {
            return false
        }
        if (!filterValue) {
            return true
        }

        const categories = Array.isArray(item.categories) ? item.categories : []
        const tags = Array.isArray(item.tags) ? item.tags : []
        return categories.includes(filterValue) || tags.includes(filterValue)
    })
}

function performSearch(query, filterValue) {
    const normalizedQuery = normalizeQuery(query)

    if (searchInput) {
        searchInput.setAttribute('value', normalizedQuery)
    }

    if (filterSelect) {
        filterSelect.value = filterValue || ''
    }

    const results = getSearchResults(normalizedQuery, filterValue)
    displayResults(results, window.store)
}

if (searchInput && !isSearchPage) {
    searchInput.value = ''
    if (filterSelect) {
        filterSelect.value = ''
    }
    sessionStorage.removeItem(SEARCH_STORAGE_KEY)
    sessionStorage.removeItem(SEARCH_FILTER_STORAGE_KEY)
}

if (isSearchPage) {
    const params = new URLSearchParams(window.location.search)
    const query = params.get('query') || sessionStorage.getItem(SEARCH_STORAGE_KEY) || ''
    const filterValue = params.get('filter') || sessionStorage.getItem(SEARCH_FILTER_STORAGE_KEY) || ''

    if (query || filterValue) {
        performSearch(query, filterValue)
        sessionStorage.removeItem(SEARCH_STORAGE_KEY)
        sessionStorage.removeItem(SEARCH_FILTER_STORAGE_KEY)

        if (window.location.search) {
            history.replaceState(null, '', window.location.pathname)
        }
    }
}
