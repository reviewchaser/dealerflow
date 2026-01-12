/**
 * Safe fetch utility that handles HTML error responses
 *
 * Prevents "Unexpected token '<'" errors when API returns HTML
 * (e.g., redirect to login page, 404 page, or error page)
 */

/**
 * Performs a fetch and ensures JSON response, with proper error handling
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{ok: boolean, status: number, data: any, error?: string}>}
 */
export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Check content-type to ensure we got JSON
    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      // Got HTML or other non-JSON response
      const bodyText = await res.text();
      const preview = bodyText.substring(0, 120).replace(/\n/g, " ");

      console.error(`[safeFetch] Non-JSON response from ${url}:`, {
        status: res.status,
        contentType,
        preview,
      });

      // Determine error message based on status
      let errorMessage = "Server returned an unexpected response";
      if (res.status === 401 || res.status === 403) {
        errorMessage = "Session expired - please sign in again";
      } else if (res.status === 404) {
        errorMessage = "Resource not found";
      } else if (res.status >= 500) {
        errorMessage = "Server error - please try again";
      }

      return {
        ok: false,
        status: res.status,
        data: null,
        error: errorMessage,
        isHtmlResponse: true,
      };
    }

    // Parse JSON response
    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data.error || data.message || `Request failed with status ${res.status}`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (error) {
    console.error(`[safeFetch] Network error for ${url}:`, error);
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message || "Network error - please check your connection",
      isNetworkError: true,
    };
  }
}

/**
 * GET request with safe JSON handling
 */
export async function safeGet(url) {
  return safeFetch(url, { method: "GET" });
}

/**
 * POST request with safe JSON handling
 */
export async function safePost(url, body) {
  return safeFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PUT request with safe JSON handling
 */
export async function safePut(url, body) {
  return safeFetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request with safe JSON handling
 */
export async function safeDelete(url, body) {
  return safeFetch(url, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request with safe JSON handling
 */
export async function safePatch(url, body) {
  return safeFetch(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export default safeFetch;
