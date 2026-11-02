import React from 'react'
import ReactDOM from 'react-dom/client'
import { UI_CSS } from '../../src/client/styles'
import { createDockStats } from '../../src/client/dock-stats'
import { createPluginSettings } from '../../src/client/plugin-settings'
import { createModelControl } from '../../src/client/model-control'
import { createDockControl } from '../../src/client/dock-control'
import { mountDockAlign } from '../../src/client/dock-align'
import { saveSimplifyConfig, loadSimplifyConfig, DEFAULT_SIMPLIFY_CONFIG } from '../../src/client/plugin-config'

window.testFixture = {
  React,
  ReactDOM,
  UI_CSS,
  createDockStats,
  createPluginSettings,
  createModelControl,
  createDockControl,
  mountDockAlign,
  saveSimplifyConfig,
  loadSimplifyConfig,
  DEFAULT_SIMPLIFY_CONFIG
}
