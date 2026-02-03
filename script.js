class TerminalSearch {
  constructor({
    inputSelector = '#search',
    suggestionsSelector = '#suggestions',
    resultSelector = '#result',
    clearButtonSelector = '#clearButton',
    terminals = []
  } = {}) {
    this.elements = {
      input: document.querySelector(inputSelector),
      suggestions: document.querySelector(suggestionsSelector),
      result: document.querySelector(resultSelector),
      clearButton: document.querySelector(clearButtonSelector)
    }

  this.terminals = terminals
    this.labels = {
      vendor: 'Производитель',
      model: 'Модель',
      connection_type: 'Тип связи',
      terminal_type: 'Тип терминала',
      pinpad: 'Пин-пад',
      sbp: 'СБП',
      preauth: 'Предавторизация',
      no_cash: 'Нет монет',
      qr_on_pinpad: 'QR на экране пин-пада'
    }

    this.top = {
      storageKey: 'terminalTopV1',
      viewDelayMs: 5000,
      timerId: null,
      viewToken: 0,
      modeKey: 'terminalTopModeV1'
    }

    this.note = {
      storageKey: 'terminalNoteV1',
      textarea: document.getElementById('noteArea'),
      clearButton: document.getElementById('clearNote')
    }

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.renderTopList()
    this.setupTopControls()
    this.setupTopSwitch()
    this.setupNote()
  }

  setupTopControls() {
    const list = document.getElementById('topList')
    if (!list) return

    const openFromItem = (item) => {
      if (!item) return
      const vendor = decodeURIComponent(item.dataset.vendor || '')
      const model = decodeURIComponent(item.dataset.model || '')
      this.openFromTop(vendor, model)
    }

    list.addEventListener('click', (e) => {
      const item = e.target.closest('.top-item')
      openFromItem(item)
    })

    list.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('top-item')) {
        e.preventDefault()
        openFromItem(e.target)
      }
    })
  }

    setupTopSwitch() {
    const buttons = document.querySelectorAll('.top-switch button')
    if (!buttons.length) return
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode
        this.switchTopMode(mode)
        buttons.forEach(b => b.classList.toggle('active', b === btn))
        try { localStorage.setItem(this.top.modeKey, mode) } catch (e) {}
      })
    })

    let saved = 'top'
    try {
      const stored = localStorage.getItem(this.top.modeKey)
      if (stored) saved = stored
    } catch (e) {}

    const initMode = Array.from(buttons).some(b => b.dataset.mode === saved) ? saved : 'top'
    buttons.forEach(b => b.classList.toggle('active', b.dataset.mode === initMode))
    this.switchTopMode(initMode)
  }

  switchTopMode(mode) {
    const list = document.getElementById('topList')
    const note = document.getElementById('noteBlock')
    if (!list || !note) return
    if (mode === 'note') {
      list.classList.add('hidden')
      note.classList.remove('hidden')
      this.loadNote()
    } else {
      note.classList.add('hidden')
      list.classList.remove('hidden')
    }
  }

  setupNote() {
    if (this.note.textarea) {
      this.note.textarea.addEventListener('input', () => {
        try {
          localStorage.setItem(this.note.storageKey, this.note.textarea.value)
        } catch (e) {}
      })
    }
    if (this.note.clearButton) {
      this.note.clearButton.addEventListener('click', () => {
        if (this.note.textarea) this.note.textarea.value = ''
        try { localStorage.removeItem(this.note.storageKey) } catch (e) {}
      })
    }
    this.loadNote()
  }

  loadNote() {
    if (!this.note.textarea) return
    const saved = localStorage.getItem(this.note.storageKey) || ''
    this.note.textarea.value = saved
  }

  setupEventListeners() {
    if (this.elements.input) {
      this.elements.input.addEventListener('input', this.handleInput.bind(this))
    }
    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener('click', this.clearSearch.bind(this))
    }

    const clearTopBtn = document.getElementById('clearTop')
    if (clearTopBtn) {
      clearTopBtn.addEventListener('click', () => this.clearTop())
    }
  }


  handleInput() {
    const searchTerm = (this.elements.input?.value || '').trim().toLowerCase()
    this.clearResults()

    if (!searchTerm) return

    const matches = this.getMatchingTerminals(searchTerm)

    if (matches.length === 1) {
      this.displayResult(matches[0])
    } else if (matches.length > 1) {
      this.displaySuggestions(matches)
    } else {
      this.showNoResultsMessage()
    }
  }

  getMatchingTerminals(searchTerm) {
    return this.terminals.filter(t =>
      (t.model || '').toLowerCase().includes(searchTerm)
    )
  }

  clearResults() {
    if (this.elements.suggestions) this.elements.suggestions.innerHTML = ''
    if (this.elements.result) this.elements.result.innerHTML = ''
    this.cancelTopViewTimer()
  }

  clearSearch() {
    if (this.elements.input) {
      this.elements.input.value = ''
      this.elements.input.focus()
    }
    this.clearResults()
  }

  displaySuggestions(matches) {
    const box = this.elements.suggestions
    if (!box) return

    const frag = document.createDocumentFragment()
    matches.forEach(terminal => {
      const suggestionElement = document.createElement('div')
      suggestionElement.className = 'suggestion'
      suggestionElement.textContent = terminal.model || ''
      suggestionElement.addEventListener('click', () => {
        if (this.elements.input) this.elements.input.value = terminal.model || ''
        this.clearResults()
        this.displayResult(terminal)
      })
      frag.appendChild(suggestionElement)
    })
    box.appendChild(frag)
  }

  showNoResultsMessage() {
    if (this.elements.suggestions) {
      this.elements.suggestions.innerHTML = '<div class="suggestion">Модель не найдена</div>'
    }
  }

  displayResult(terminal) {
    if (this.elements.result) {
      this.elements.result.innerHTML = this.renderCard(terminal)
    }
    this.startTopViewTimer(terminal)
  }

  renderCard(terminal) {
    const vendor = this.escapeHtml(terminal.vendor ?? '')
    const model = this.escapeHtml(terminal.model ?? '')
    const termType = this.escapeHtml(terminal.terminal_type ?? '')

    const connectionBadges = this.getConnectionBadges(terminal.connection_type || '')
      .map(label => this.makeBadge(label))
      .join('')

    const otherBadges = this.getOtherBadges(terminal)
      .map(label => this.makeBadge(label))
      .join('')

    const isIntegration = (terminal.terminal_type || '').toLowerCase().includes('интеграционный')
    const hasSbp = !this.isNo(terminal.sbp || '')
    const sbpNote = (isIntegration && hasSbp) ? this.getSbpIntegrationMessage(terminal.model || '') : ''

    return `
      <div class="card">
        <div class="card-header">
          <div><span class="card-title">${vendor}</span> — ${model} <span class="badge-termType">${termType}</span></div>
        </div>

        ${connectionBadges
          ? `<div class="section-label">Тип связи</div>
             <div class="badge-group">${connectionBadges}</div>`
          : ''}

        ${otherBadges
          ? `<div class="section-label">Возможности</div>
             <div class="badge-group">${otherBadges}</div>`
          : ''}

        ${sbpNote}
      </div>
    `
  }

  // createFieldHTML — удалён как неиспользуемый и потенциально падающий

  getOtherBadges(terminal) {
    const keys = ['pinpad', 'sbp', 'preauth', 'no_cash', 'qr_on_pinpad']
    const out = []
    for (const k of keys) {
      const v = (terminal[k] ?? '').toString().trim()
      if (!this.isNo(v)) {
        if (k === 'pinpad') {
          out.push(`${this.getLabel(k)}: ${this.escapeHtml(v)}`)
        } else {
          out.push(this.getLabel(k))
        }
      }
    }
    return out
  }

  getConnectionBadges(connectionStr) {
    const s = (connectionStr || '').toLowerCase()
    const badges = new Set()

    if (/(wi[\-\s]?fi|wifi)/.test(s)) badges.add('Wi-Fi')
    if (/\b2g\b/.test(s)) badges.add('2G')
    if (/\b3g\b/.test(s)) badges.add('3G')
    if (/\b4g\b/.test(s)) badges.add('4G')
    if (/(^|[\s,;])(?:eth|ethernet)(?=($|[\s,;]))/.test(s)) badges.add('Ethernet')
    if (/\busb\b/.test(s)) badges.add('USB')
    if (/(bluetooth|\bbt\b)/.test(s)) badges.add('Bluetooth')
    if (/\bnfc\b/.test(s)) badges.add('NFC')
    if (/\bsim\b/.test(s)) badges.add('SIM')

    if (badges.size === 0 && connectionStr) {
      badges.add(this.escapeHtml(connectionStr))
    }
    return Array.from(badges)
  }

  isNo(value) {
    const v = value.toString().trim().toLowerCase()
    return v === 'нет' || v === 'no' || v === 'false' || v === '0'
  }

  makeBadge(label) {
    return `<span class="badge">${label}</span>`
  }

  escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  getSbpIntegrationMessage(model) {
    const modelLower = (model || '').toLowerCase()
    let message = ''

    if (modelLower === 'aisino v37 (usb)') {
      message = 'Работаем с 1C, Iiko (Айка), Эвотор.<br>По другим кассам — в техподдержку производителя.'
    } else if (modelLower === 'telpo p8 (eth, wi-fi, usb)') {
      message = 'Работаем с 1C, Iiko (Айка), R-Keeper Эвотор, Штрих-М, SetRetail, Бифит 3, Продуман. Проверь в БЗ — не все версии пока подходят.<br>По другим кассам — в техподдержку производителя.'
    } else {
      message = 'Работаем с 1C, Iiko (Айка).<br>По другим кассам — в техподдержку производителя.'
    }

    return `<div class="field highlight">${message}</div>`
  }

  getLabel(key) {
    return this.labels[key] || key
  }

  startTopViewTimer(terminal) {
    this.cancelTopViewTimer()
    const id = this.makeTerminalId(terminal)
    const myToken = ++this.top.viewToken
    this.top.timerId = setTimeout(() => {
      if (myToken === this.top.viewToken) {
        this.recordTopView(id, terminal)
      }
    }, this.top.viewDelayMs)
  }

  openFromTop(vendor, model) {
    const term = this.terminals.find(t =>
      (t.vendor || '').toString().trim() === vendor &&
      (t.model || '').toString().trim() === model
    )

    if (!term) {
      if (this.elements.result) {
        this.elements.result.innerHTML = '<div class="field">Терминал не найден в базе.</div>'
      }
      return
    }

    if (this.elements.input) this.elements.input.value = term.model || ''

    this.clearResults()
    this.displayResult(term)
  }

  cancelTopViewTimer() {
    if (this.top.timerId) {
      clearTimeout(this.top.timerId)
      this.top.timerId = null
    }
  }

  makeTerminalId(terminal) {
    const vendor = (terminal.vendor ?? '').toString().trim()
    const model = (terminal.model ?? '').toString().trim()
    return `${vendor} | ${model}`
  }

  getTopData() {
    try {
      const raw = localStorage.getItem(this.top.storageKey)
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      return {}
    }
  }

  setTopData(data) {
    try {
      localStorage.setItem(this.top.storageKey, JSON.stringify(data))
    } catch (e) {
      // игнорируем, например, в приватном режиме
    }
  }

  recordTopView(id, terminal) {
    const data = this.getTopData()
    const now = Date.now()
    if (!data[id]) {
      data[id] = {
        vendor: terminal.vendor ?? '',
        model: terminal.model ?? '',
        views: 0,
        lastViewed: 0
      }
    }
    data[id].views += 1
    data[id].lastViewed = now
    this.setTopData(data)
    this.renderTopList()
  }

  renderTopList() {
    const box = document.getElementById('topList')
    if (!box) return

    const data = this.getTopData()
    const items = Object.entries(data).map(([id, v]) => ({ id, ...v }))

    items.sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views
      return b.lastViewed - a.lastViewed
    })

    const top5 = items.slice(0, 5)

    if (top5.length === 0) {
      box.classList.add('empty')
      box.innerHTML = 'Пока пусто — откройте карточку терминала, и через 5 секунд он появится здесь.'
      return
    }

    box.classList.remove('empty')
    box.innerHTML = top5.map(it => `
      <div class="top-item"
           role="button" tabindex="0"
           data-vendor="${encodeURIComponent(it.vendor)}"
           data-model="${encodeURIComponent(it.model)}">
        <div class="top-title">${this.escapeHtml(it.vendor)} — ${this.escapeHtml(it.model)}</div>
        <div class="top-meta">
          <span class="top-badge">просмотры: ${it.views}</span>
        </div>
      </div>
    `).join('')
  }

  clearTop() {
    this.setTopData({})
    this.renderTopList()
  }
}

const terminalSearch = new TerminalSearch({
  inputSelector: '#search',
  suggestionsSelector: '#suggestions',
  resultSelector: '#result',
  clearButtonSelector: '#clearButton',
  terminals: terminals
})
