const controllers = new Map<string, { cancelRequested: boolean }>();

export function markAnalysisRunning(flowId: string) {
  controllers.set(flowId, { cancelRequested: false });
}

export function requestAnalysisCancel(flowId: string) {
  const entry = controllers.get(flowId);
  if (!entry) {
    return false;
  }
  entry.cancelRequested = true;
  return true;
}

export function isAnalysisCancelRequested(flowId: string) {
  return controllers.get(flowId)?.cancelRequested ?? false;
}

export function clearAnalysisController(flowId: string) {
  controllers.delete(flowId);
}

