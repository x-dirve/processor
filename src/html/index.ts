import { extend, isFunction, isObject } from "@x-drive/utils";
import { create as Cache } from "@x-drive/lru";
import { inject } from "@x-drive/injection";
import { md5 } from "../helper";
import type Koa from "koa";
import path from "path";
import fs from "fs";

type RouteOption = Record<string, string | string[] | Function>;
interface HtmlProcessorOptions {
    route?: RouteOption;
}

interface IHtmlProcessorConfig {
    /**是否清除客户端 LocalStorage */
    clearLocalStorage?: boolean;

    /**html 文件的根目录 */
    root: string;
}

var conf: IHtmlProcessorConfig = {
    "root": null
};

const html_cache = Cache(
    "HTML_CACHE"
    , {
        "maxAge": 1000 * 60 * 60
        , "max": 10
    }
);

function processorVar(html: string, req: Koa.Context) {
    return inject(html, req);
}

// 处理 HTML
//   读取 HTML 文件，如果没有缓存则缓存
//   填充相关字段
//   根据配置可以设置为清除本地缓存
//   设置缓存头
//   根据配置设置相应头部
function htmlProcessor(pathname: string, options: HtmlProcessorOptions, context: Koa.Context) {
    if (!conf.root) {
        throw new Error("必须指定 html 文件的根目录");
    }

    var filename = path.resolve(conf.root, pathname);
    var cacheKey: string;
    var html: string;
    var route: RouteOption;

    // 取出参数
    if (options) {
        route = options.route;
    }

    // 生成缓存 key
    cacheKey = md5(pathname);

    try {
        html = html_cache.get(cacheKey);
        if (!html) {
            html = fs.readFileSync(filename, "utf8");
            html_cache.set(cacheKey, html);
        }
    } catch (e) {
        console.log("HTML Process Error", e);
        return null;
    }

    // 无法正确读取 HTML
    // 交给后续的 404 处理
    if (!html) {
        return null;
    }

    // 进行参数处理
    html = processorVar(html, context);

    // 按照配置清空 localStorage
    if (conf.clearLocalStorage || context && context.query.no_cache) {
        html = html.replace('<head>', '<head><script>if(window.localStorage) {window.localStorage.clear()}<\/script>');
    }

    // 读取 route 的配置并设置对应的 headers 信息
    var headers = route && route.headers;
    if (headers && context) {
        Object.keys(headers).forEach(key => {
            let val: string | string[];
            if (isFunction(headers[key])) {
                val = headers[key]();
            } else {
                val = headers[key];
            }
            context.set(key, val);
        });
    }

    // 返回网页
    return html;
}

function init(c?: IHtmlProcessorConfig) {
    if (isObject(c)) {
        conf = extend(conf, c);
    }
};

export { init };

export { htmlProcessor };
