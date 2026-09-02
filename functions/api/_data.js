// =============================================================================
// Server-side view of the portfolio data.
//
// /data.js is the single source of truth. It is a UMD module: the browser reads
// window.PORTFOLIO, and this file imports the same object so the public API can
// never drift from the pages. Do not copy data here.
// =============================================================================

import PORTFOLIO_DATA from "../../data.js";

export const PORTFOLIO = PORTFOLIO_DATA;
export const API_VERSION = "2.0.0";
export const API_BUILD = "2026-09-02";
