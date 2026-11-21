import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getAnalysis } from "../services/repositoryService";
import { apiMessage } from "../services/api";

export default function useAnalysis() {
  const { analysisId } = useParams();
  const location = useLocation();
  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!location.state?.analysis);
  useEffect(() => {
    if (analysis) return;
    getAnalysis(analysisId)
      .then(({ data }) => setAnalysis(data.analysis))
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [analysis, analysisId]);
  return { analysis, analysisId, error, loading };
}
