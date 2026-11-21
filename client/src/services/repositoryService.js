import api from "./api";
export const importGithub = (url) => api.post("/repositories/github", { url });
export const importZip = (url, archive) => {
  const form = new FormData();
  form.append("url", url);
  form.append("archive", archive);
  return api.post("/repositories/zip", form);
};
export const getAnalysis = (id) => api.get(`/analysis/${id}`);
export const getRepositoryConnections = () => api.get("/repositories/connections");
export const configureRepositoryWebhook = (url, secret) =>
  api.post("/repositories/webhook", { url, secret });
export const syncRepository = (url) => api.post("/repositories/sync", { url });
