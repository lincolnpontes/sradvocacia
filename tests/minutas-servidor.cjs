const fs = require("node:fs");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
// Implementação real do módulo .gs com Drive/Script Properties fictícios; sem chamadas externas.
module.exports = function servidor(usuarios) {
  const props = new Map(), files = new Map(), pastas = new Map();
  const hash = s => createHash("sha256").update(s).digest("hex");
  const env = vm.createContext({
    srReadRecord_:() => ({ data:{ usuarios } }), srSafeEquals_:(a,b) => a === b,
    srHashText_:hash, srNow_:() => new Date().toISOString(), srWithLock_:fn => fn(),
    srVerifyAdvancedPassword_:valor => ({ authorized:valor === "admin-teste" }),
    PropertiesService:{ getScriptProperties:() => ({
      getProperty:k => props.get(k), setProperty:(k,v) => props.set(k,v), getProperties:() => Object.fromEntries(props)
    }) },
    MimeType:{ PLAIN_TEXT:"text/plain" },
    DriveApp:{
      createFolder:() => {
        const id = "pasta-" + pastas.size, pasta = { getId:() => id, createFile:(_nome,raw) => {
          const id = "f-" + files.size; files.set(id,raw); return { getId:() => id };
        } };
        pastas.set(id,pasta); return pasta;
      },
      getFolderById:id => pastas.get(id),
      getFileById:id => ({ getBlob:() => ({ getDataAsString:() => files.get(id) }) })
    }
  });
  vm.runInContext(fs.readFileSync(require.resolve("../apps-script/Minutas.gs"), "utf8"),env);
  return { files, props, chamar:(a,p) => JSON.parse(JSON.stringify(env.srMinutas_(a,p))) };
};
