import { h, createApp } from 'vue'

import { appInstance } from '../install.js'
import { isSSR } from '../plugins/Platform.js'
import { createGlobalNode, removeGlobalNode } from './global-nodes.js'

const ssrAPI = {
  onOk: () => ssrAPI,
  okCancel: () => ssrAPI,
  hide: () => ssrAPI,
  update: () => ssrAPI
}

export function merge (target, source) {
  for (const key in source) {
    if (key !== 'spinner' && Object(source[key]) === source[key]) {
      target[key] = Object(target[key]) !== target[key]
        ? {}
        : { ...target[key] }

      merge(target[key], source[key])
    }
    else {
      target[key] = source[key]
    }
  }
}

export default function (DefaultComponent, supportsCustomComponent) {
  return pluginProps => {
    if (isSSR === true) { return ssrAPI }

    let DialogComponent, props, provide
    const isCustom = supportsCustomComponent === true &&
      pluginProps.component !== void 0

    if (isCustom === true) {
      const { component, componentParent: parent, componentProps } = pluginProps

      DialogComponent = component
      props = componentProps
      provide = parent !== void 0 && parent.$ !== void 0 && parent.$.provides !== void 0
        ? parent.$.provides
        : void 0
    }
    else {
      const { class: klass, style, ...otherProps } = pluginProps

      DialogComponent = DefaultComponent
      props = otherProps
      klass !== void 0 && (otherProps.cardClass = klass)
      style !== void 0 && (otherProps.cardStyle = style)
    }

    const
      okFns = [],
      cancelFns = [],
      API = {
        onOk (fn) {
          okFns.push(fn)
          return API
        },
        onCancel (fn) {
          cancelFns.push(fn)
          return API
        },
        onDismiss (fn) {
          okFns.push(fn)
          cancelFns.push(fn)
          return API
        },
        hide () {
          vm.$refs.dialog.hide()
          return API
        },
        update (componentProps) {
          if (vm !== null) {
            if (isCustom === true) {
              Object.assign(props, componentProps)
            }
            else {
              const { class: klass, style, ...cfg } = componentProps

              klass !== void 0 && (cfg.cardClass = klass)
              style !== void 0 && (cfg.cardStyle = style)
              merge(props, cfg)
            }

            vm.$forceUpdate()
          }

          return API
        }
      }

    const el = createGlobalNode()

    let emittedOK = false

    const onOk = data => {
      emittedOK = true
      okFns.forEach(fn => { fn(data) })
    }

    const onHide = () => {
      app.unmount(el)
      removeGlobalNode(el)
      app = null
      vm = null

      if (emittedOK !== true) {
        cancelFns.forEach(fn => { fn() })
      }
    }

    let app = createApp({
      name: 'QGlobalDialog',
      provide,
      render () {
        return h(DialogComponent, {
          ref: 'dialog',
          ...props,
          onOk,
          onHide
        })
      }
    })

    app.config.globalProperties = appInstance.config.globalProperties

    let vm = app.mount(el)
    vm.$refs.dialog.show()

    return API
  }
}
