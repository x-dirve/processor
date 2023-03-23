import crypto from "crypto";

/**
 * 根据传入的参数生成一个 MD5 值
 */
function md5(...args: any[]) {
    const conditions: XLab.JsonObject = {};
    args.forEach(function (item, index) {
        conditions[index] = item;
    });
    return crypto.createHash("md5")
        .update(JSON.stringify(conditions), "utf8")
        .digest("hex");
}
export { md5 }
