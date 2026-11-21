const { getScan } = require("../services/analysisCache");

function getAnalysis(req, res) {
  const analysis = getScan(req.user._id, req.params.analysisId);
  if (!analysis)
    return res
      .status(404)
      .json({
        message:
          "This analysis has expired or is unavailable. Analysis results are kept for one hour; import the repository again to create a fresh analysis.",
      });
  res.json({ analysis });
}

module.exports = { getAnalysis };
