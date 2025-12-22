/**
 * HTTP 请求工具
 * 支持 微信云托管 callContainer 和 普通 HTTPS 降级
 */

import type { ApiResponse } from '@/types'
import { StorageKeys, getStorage } from '@/utils/storage'

// 环境变量
const CLOUD_ENV_ID = import.meta.env.VITE_WX_CLOUD_ENV_ID
const SERVICE_NAME = import.meta.env.VITE_WX_SERVICE_NAME
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
const TIMEOUT = 120000 // 2分钟超时

/**
 * 请求配置接口
 */
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  timeout?: number
  retry?: number
  retryDelay?: number
  showError?: boolean
}

/**
 * 获取请求头
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-WX-SERVICE': SERVICE_NAME, // 云托管服务名
  }

  const token = getStorage<string>(StorageKeys.TOKEN)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * 构建 URL 查询字符串
 */
function buildQueryString(params?: any): string {
  if (!params || Object.keys(params).length === 0) {
    return ''
  }
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return queryParams ? `?${queryParams}` : ''
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 封装的请求方法（带重试机制）
 */
export function request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
  const {
    retry = 0,
    retryDelay = 1000,
    showError = true,
    ...requestConfig
  } = config

  return requestWithRetry<T>(requestConfig, retry, retryDelay, showError)
}

/**
 * 核心请求适配器
 */
function requestAdapter(config: Omit<RequestConfig, 'retry' | 'retryDelay' | 'showError'>): Promise<any> {
  // 检查是否在微信小程序环境且配置了云环境ID
  const isWechatMp = typeof wx !== 'undefined' && !!wx.cloud

  if (isWechatMp && CLOUD_ENV_ID) {
    return new Promise((resolve, reject) => {
      // 确保初始化
      wx.cloud.init({ env: CLOUD_ENV_ID })

      // 构造云托管路径：/v1/auth/login
      // callContainer 不需要完整的域名，只需要 path
      let path = config.url
      if (!path.startsWith('/')) {
        path = '/' + path
      }
      // 确保包含 /v1 前缀 (如果 config.url 没带，这里需要根据后端路由决定)
      // 我们的后端路由组是 /v1，且 request 调用时通常是 /auth/login
      // 需要确认调用方是否带了 /v1。
      // 观察之前的 BASE_URL 是 .../v1
      // 说明调用方传的 config.url 可能是 /auth/login
      // 所以这里需要手动加上 /v1 前缀
      if (!path.startsWith('/v1')) {
        path = '/v1' + path
      }

      // 处理 GET 请求参数拼接到 path
      if (config.method === 'GET' && config.data) {
        path += buildQueryString(config.data)
      }

      wx.cloud.callContainer({
        config: {
          env: CLOUD_ENV_ID
        },
        path: path,
        header: {
          ...getHeaders(),
          ...config.header
        },
        method: config.method || 'GET',
        data: config.method === 'GET' ? undefined : config.data, // callContainer GET 不支持 data Payload
        success: (res: any) => {
          // callContainer 返回结构：{ data: ..., statusCode: ..., header: ... }
          resolve(res)
        },
        fail: (err: any) => {
          console.error('cloud.callContainer failed', err)
          reject(err)
        }
      })
    })
  }

  // 降级：标准 HTTPS 请求 (H5 / App / 未配置云环境)
  return new Promise((resolve, reject) => {
    const finalUrl = config.method === 'GET'
      ? `${BASE_URL}${config.url}${buildQueryString(config.data)}`
      : `${BASE_URL}${config.url}`

    uni.request({
      url: finalUrl,
      method: config.method || 'GET',
      data: config.method === 'GET' ? undefined : config.data,
      header: {
        ...getHeaders(),
        ...config.header,
      },
      timeout: config.timeout || TIMEOUT,
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 带重试的请求实现
 */
async function requestWithRetry<T = any>(
  config: Omit<RequestConfig, 'retry' | 'retryDelay' | 'showError'>,
  retriesLeft: number,
  retryDelay: number,
  showError: boolean,
  attempt: number = 1
): Promise<ApiResponse<T>> {
  try {
    const res: any = await requestAdapter(config)
    const data = res.data as ApiResponse<T>

    // 成功判断 (callContainer 和 uni.request statusCode 字段一致)
    if (res.statusCode === 200) {
      if (data.code === 0) {
        return data
      } else {
        // 业务错误
        if (showError) {
          uni.showToast({
            title: data.message || '请求失败',
            icon: 'none',
            duration: 2000,
          })
        }
        throw data
      }
    } else if (res.statusCode === 401) {
      if (showError) {
        uni.showToast({ title: '登录已过期', icon: 'none' })
      }
      uni.removeStorageSync(StorageKeys.TOKEN)
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/user/login' })
      }, 1500)
      throw data
    } else if (res.statusCode === 404) {
      throw { ...data, statusCode: 404 }
    } else {
      if (showError) {
        uni.showToast({ title: `请求失败: ${res.statusCode}`, icon: 'none' })
      }
      throw data
    }
  } catch (err) {
    // 重试逻辑
    if (retriesLeft > 0) {
      console.log(`Retrying... (${retriesLeft} left)`)
      await delay(retryDelay)
      return requestWithRetry<T>(config, retriesLeft - 1, retryDelay, showError, attempt + 1)
    }
    if (showError && !err.code) { // 避免重复报错 (err.code 存在说明是业务错误已报过)
      uni.showToast({ title: '网络请求失败', icon: 'none' })
    }
    throw err
  }
}

// 导出方法
export function get<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'GET', data })
}

export function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', data })
}

/**
 * 文件上传 (适配云托管?)
 * 云托管 callContainer 暂不支持直接 uploadFile，通常建议走 COS SDK 上传或 HTTPS 上传
 * 这里保持 HTTPS 上传，或者后续改造为 COS 直传
 */
export function uploadFile(config: { filePath: string; name?: string; formData?: Record<string, string> }): Promise<any> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}/upload`, // 上传通常还是走 HTTPS 流，或者改造为 COS 签名上传
      filePath: config.filePath,
      name: config.name || 'file',
      formData: config.formData || {},
      header: getHeaders(),
      success: (res) => {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data)
          resolve(data)
        } else {
          reject(res)
        }
      },
      fail: reject,
    })
  })
}