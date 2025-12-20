/**
 * AI Supply Chain Security API Routes
 *
 * Endpoints for AI-BOM, model provenance,
 * vulnerability scanning, and supply chain analytics.
 */

import { Router, Request, Response } from 'express';
import { supplyChainEngine } from '../../core/supply-chain/supply-chain-engine';

const router = Router();

/**
 * GET /api/supply-chain/sboms
 * Get all AI Bills of Materials
 */
router.get('/sboms', (req: Request, res: Response) => {
  try {
    const sboms = supplyChainEngine.getAllSBOMs();

    res.json({
      success: true,
      data: sboms,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get SBOMs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/supply-chain/sboms/:modelId
 * Get SBOM for a specific model
 */
router.get('/sboms/:modelId', (req: Request, res: Response) => {
  try {
    const sbom = supplyChainEngine.getSBOM(req.params.modelId);

    if (!sbom) {
      return res.status(404).json({
        success: false,
        error: 'SBOM not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: sbom,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get SBOM',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/supply-chain/sboms
 * Generate SBOM for a model
 */
router.post('/sboms', (req: Request, res: Response) => {
  try {
    const { modelId, name, version, type, framework, frameworkVersion, architecture, size, licenses } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'modelId is required',
        timestamp: new Date().toISOString(),
      });
    }

    const sbom = supplyChainEngine.generateSBOM(modelId, {
      name,
      version,
      type,
      framework,
      frameworkVersion,
      architecture,
      size,
      licenses,
    });

    res.status(201).json({
      success: true,
      data: sbom,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate SBOM',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/supply-chain/vulnerabilities/:modelId
 * Get vulnerabilities for a model
 */
router.get('/vulnerabilities/:modelId', (req: Request, res: Response) => {
  try {
    const vulnerabilities = supplyChainEngine.getVulnerabilities(req.params.modelId);

    res.json({
      success: true,
      data: vulnerabilities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get vulnerabilities',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/supply-chain/vulnerabilities/:modelId/scan
 * Scan model for vulnerabilities
 */
router.post('/vulnerabilities/:modelId/scan', (req: Request, res: Response) => {
  try {
    const vulnerabilities = supplyChainEngine.scanVulnerabilities(req.params.modelId);

    res.json({
      success: true,
      data: vulnerabilities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to scan vulnerabilities',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/supply-chain/provenance/:modelId
 * Verify model provenance
 */
router.get('/provenance/:modelId', (req: Request, res: Response) => {
  try {
    const result = supplyChainEngine.verifyProvenance(req.params.modelId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify provenance',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/supply-chain/attestations/:modelId
 * Add attestation to model
 */
router.post('/attestations/:modelId', (req: Request, res: Response) => {
  try {
    const { type, issuer, subject, claims, signature, expiresAt } = req.body;

    if (!type || !issuer || !subject || !signature) {
      return res.status(400).json({
        success: false,
        error: 'type, issuer, subject, and signature are required',
        timestamp: new Date().toISOString(),
      });
    }

    const attestation = supplyChainEngine.addAttestation(req.params.modelId, {
      type,
      issuer,
      subject,
      issuedAt: new Date().toISOString(),
      expiresAt,
      claims: claims || {},
      signature,
    });

    res.status(201).json({
      success: true,
      data: attestation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add attestation',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/supply-chain/analytics
 * Get supply chain analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = supplyChainEngine.getAnalytics();

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as supplyChainRouter };
