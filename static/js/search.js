function displayResults(results, store) {
    const searchResults = document.getElementById('results');
    if (!searchResults) {
        console.error('Search results container is missing in the DOM');
        return;
    }
    if (results.length) {
        let resultList = ''
        // Iterate and build result list elements
        for (const n in results) {
            const item = store[results[n].ref]
            resultList += '<div class="card"><a href="' + item.url + '"><div class="text"><h2>' + item.title + '</h2>'
            resultList += '<p class="small">' + item.content.substring(0, 150) + '...</p></a></div></div>'
        }
        searchResults.innerHTML = resultList
    } else {
        searchResults.innerHTML = 'No results found.'
    }
}

const SEARCH_STORAGE_KEY = 'searchQuery'

const searchForm = document.getElementById('search')
const searchInput = document.getElementById('search-input')
const isSearchPage = window.location.pathname.replace(/\/$/, '') === '/search'

if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
        const queryValue = searchInput.value.trim()
        if (!queryValue) {
            return
        }

        event.preventDefault()
        sessionStorage.setItem(SEARCH_STORAGE_KEY, queryValue)
        window.location.href = '/search/'
    })
}

function performSearch(query) {
    if (!query) {
        return
    }

    searchInput.setAttribute('value', query)

    const idx = lunr(function () {
        this.ref('id')
        this.field('title', {
            boost: 15
        })
        this.field('content', {
            boost: 10
        })

        for (const key in window.store) {
            this.add({
                id: key,
                title: window.store[key].title,
                content: window.store[key].content
            })
        }
    })

    let results = idx.search(query)
    const excludedUrls = [
        window.location.origin + '/search/',
        window.location.origin + '/search'
    ]

    results = results.filter(result => {
        const itemUrl = window.store[result.ref] && window.store[result.ref].url
        return itemUrl && !excludedUrls.includes(itemUrl)
    })

    displayResults(results, window.store)
}

if (searchInput && !isSearchPage) {
    searchInput.value = ''
    sessionStorage.removeItem(SEARCH_STORAGE_KEY)
}

if (isSearchPage) {
    const params = new URLSearchParams(window.location.search)
    let query = params.get('query') || sessionStorage.getItem(SEARCH_STORAGE_KEY)

    if (query) {
        performSearch(query)
        sessionStorage.removeItem(SEARCH_STORAGE_KEY)

        if (window.location.search) {
            history.replaceState(null, '', window.location.pathname)
        }
    }
}
