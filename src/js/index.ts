import { create as Cache } from "@x-drive/lru";
import { inject } from "@x-drive/injection";
import { md5 } from "../helper";
import type Koa from "koa";
import path from "path";
import fs from "fs";
import { extend, isObject } from "@x-drive/utils";

interface IJsProcessorConfig {
    /**是否清除客户端 LocalStorage */
    clearLocalStorage?: boolean;

    /**html 文件的根目录 */
    root: string;
}

var conf: IJsProcessorConfig;

const JsCache = Cache(
    "JS_CACHE"
    , {
        "maxAge": 1000 * 60 * 60 * 24
        , "max": 20
    }
);

function processorVar(html: string, req: Koa.Context) {
    return inject(html, req);
}

// 处理 JS 文件
function jsProcessor(pathname: string, context: Koa.Context) {
    const filename = path.resolve(conf.root + pathname);
    var cacheKey: string;
    var js: string;

    // 生成缓存 key
    cacheKey = md5(pathname);

    // 检查是否有缓存
    // 如果有缓存直接返回
    try {
        js = JsCache.get(cacheKey);
        if (!js) {
            js = fs.readFileSync(filename, "utf8");
            JsCache.set(cacheKey, js);
        }
    } catch (e) {
        console.log("JS Process Error", e);
        return null;
    }

    // 无法正确读取 JS
    // 交给后续的 404 处理
    if (!js) {
        return null;
    }

    // 进行参数处理
    js = processorVar(js, context);

    return js
}

function init(c?: IJsProcessorConfig) {
    if (isObject(c)) {
        conf = extend(conf, c);
    }
};
export { init }

export { jsProcessor };
