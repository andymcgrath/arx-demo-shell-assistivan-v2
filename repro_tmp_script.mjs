import { build } from "esbuild";
import { createActor } from "xstate";
import path from "path";

const result = await build({
  entryPoints: [path.resolve("client/workflows/coaDme.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  external: [],
  tsconfig: "tsconfig.json",
});
const code = result.outputFiles[0].text;
const modPath = "/tmp/coaDme.bundled.mjs";
await import("fs/promises").then(fs => fs.writeFile(modPath, code));
const { coaDmeMachine } = await import(modPath);

const actor = createActor(coaDmeMachine);
actor.start();
actor.send({ type: "ENROLL", portal: "crm" });
actor.send({ type: "VERIFY_SMS", portal: "patient" });
actor.send({ type: "VERIFY_OTP", portal: "patient" });
actor.send({ type: "CONFIRM_CONSENT", portal: "patient" });
actor.send({ type: "RUN_BI", portal: "crm" });
actor.send({ type: "COMPLETE_BI", portal: "crm", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" });
let snap = actor.getSnapshot();
console.log("after COMPLETE_BI:", snap.value, snap.context.workflowData.biStatus, snap.context.workflowData.medicalBenefitStatus, snap.context.workflowData.dmeProviderTransferStatus);
actor.send({ type: "NOTIFY_PROVIDER_TRANSFER", portal: "crm" });
snap = actor.getSnapshot();
console.log("after NOTIFY_PROVIDER_TRANSFER:", snap.value, snap.context.workflowData.dmeProviderTransferStatus, snap.context.workflowData.dmeTransferSmsSent);
