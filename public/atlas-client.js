/**
 * ATLAS framework-free browser client.
 *
 * For host applications that are not React — plain HTML, Vue, Svelte, Django
 * templates, anything. Drop in one script tag and you have a live incident
 * feed plus the triage engine.
 *
 * @example
 * <script src="http://localhost:4102/atlas-client.js"></script>
 * <script>
 *   const atlas = Atlas.connect({
 *     baseUrl: 'http://localhost:4102',
 *     onPoint: (point) => console.log('new incident', point.label),
 *   })
 *
 *   atlas.report({ lat: 20.3536, lng: 85.8195, category: 'fire', label: 'Smoke' })
 *   atlas.triage({ category: 'medical', description: 'not breathing', reportCount: 3 })
 *     .then((r) => console.log(r.priority))   // => 'P0'
 *   // atlas.disconnect()
 * </script>
 */
(function (global) {
  'use strict'

  function connect(options) {
    if (!options || !options.baseUrl) {
      throw new Error('Atlas.connect requires a baseUrl')
    }

    var baseUrl = options.baseUrl.replace(/\/$/, '')
    var source = new EventSource(baseUrl + '/api/events')

    source.addEventListener('point.created', function (event) {
      if (typeof options.onPoint === 'function') {
        options.onPoint(JSON.parse(event.data))
      }
    })

    source.onopen = function () {
      if (typeof options.onStatusChange === 'function') options.onStatusChange('live')
    }

    source.onerror = function () {
      // EventSource reconnects on its own; this is informational only.
      if (typeof options.onStatusChange === 'function') options.onStatusChange('reconnecting')
    }

    function asJson(response) {
      if (!response.ok) throw new Error('ATLAS request failed with ' + response.status)
      return response.json()
    }

    /** Pins an incident to the map. Every listener sees it immediately. */
    function report(point) {
      return fetch(baseUrl + '/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point),
      }).then(asJson)
    }

    /**
     * Existing incidents. `since` accepts ISO-8601 or epoch milliseconds, and
     * `category` filters to one kind.
     */
    function list(filter) {
      var params = new URLSearchParams()
      if (filter && filter.since) params.set('since', filter.since)
      if (filter && filter.category) params.set('category', filter.category)

      var query = params.toString()
      return fetch(baseUrl + '/api/points' + (query ? '?' + query : '')).then(asJson)
    }

    /**
     * Scores a report without storing it — priority P0..P3 plus the factors
     * behind the score. Useful on its own even if you never render the map.
     */
    function triage(input) {
      return fetch(baseUrl + '/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(asJson)
    }

    /** Grid-bucketed repeat-incident zones, worst first. */
    function hotspots(window) {
      return fetch(baseUrl + '/api/hotspots' + (window ? '?window=' + window : '')).then(asJson)
    }

    return {
      report: report,
      list: list,
      triage: triage,
      hotspots: hotspots,
      disconnect: function () {
        source.close()
      },
    }
  }

  global.Atlas = { connect: connect }
})(window)
