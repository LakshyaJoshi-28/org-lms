const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

const DEFAULT_TEMPLATE = {
  title: 'CERTIFICATE OF COMPLETION',
  primaryColor: '#1E3A8A', // Navy Blue
  accentColor: '#D97706',  // Warm Gold
  fontFamily: 'Inter',
  borderStyle: 'classic_gold',
  layoutStyle: 'centered'
};

/**
 * Generate a unique Certificate ID (e.g., CERT-2026-A8F3B9)
 */
const generateUniqueCertificateId = async () => {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `CERT-${year}-${randomHex}`;

    const existing = await prisma.certificate.findUnique({
      where: { certificateId: candidateId }
    });

    if (!existing) return candidateId;
    attempts++;
  }
  return `CERT-${year}-${Date.now().toString().slice(-6)}`;
};

/**
 * Get or create Organization Certificate Template Settings
 */
const getOrCreateTemplateSettings = async (organizationId) => {
  let template = await prisma.certificateTemplate.findUnique({
    where: { organizationId }
  });

  if (!template) {
    template = await prisma.certificateTemplate.create({
      data: {
        organizationId,
        ...DEFAULT_TEMPLATE
      }
    });
  }

  return withId(template);
};

/**
 * Generate Certificate for a Completed Training Assignment (Idempotent)
 */
const generateCertificateForAssignment = async (trainingAssignmentId) => {
  const tAssignId = String(trainingAssignmentId);

  // Check if certificate already exists for this assignment (Idempotency)
  const existingCertificate = await prisma.certificate.findUnique({
    where: { trainingAssignmentId: tAssignId },
    include: {
      employee: {
        select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } }
      },
      training: { select: { id: true, title: true } },
      organization: { select: { id: true, name: true, code: true } }
    }
  });

  if (existingCertificate) {
    return withId(existingCertificate);
  }

  // Fetch Training Assignment details
  const assignment = await prisma.trainingAssignment.findUnique({
    where: { id: tAssignId },
    include: {
      employee: {
        select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } }
      },
      training: { select: { id: true, title: true } },
      organization: { select: { id: true, name: true, code: true } }
    }
  });

  if (!assignment) {
    throw new ApiError(404, 'Training assignment not found');
  }

  if (assignment.status !== 'Completed') {
    throw new ApiError(400, 'Certificate can only be issued for completed trainings');
  }

  // Fetch template settings at the time of issuance
  const template = await getOrCreateTemplateSettings(assignment.organizationId);

  const certId = await generateUniqueCertificateId();
  const completionDate = assignment.completedDate || new Date();

  // Create Certificate record with immutable template snapshot
  const certificate = await prisma.certificate.create({
    data: {
      certificateId: certId,
      trainingAssignmentId: assignment.id,
      employeeId: assignment.employeeId,
      trainingId: assignment.trainingId,
      organizationId: assignment.organizationId,
      issueDate: new Date(),
      completionDate,
      templateSnapshot: {
        title: template.title || DEFAULT_TEMPLATE.title,
        primaryColor: template.primaryColor || DEFAULT_TEMPLATE.primaryColor,
        accentColor: template.accentColor || DEFAULT_TEMPLATE.accentColor,
        fontFamily: template.fontFamily || DEFAULT_TEMPLATE.fontFamily,
        borderStyle: template.borderStyle || DEFAULT_TEMPLATE.borderStyle,
        layoutStyle: template.layoutStyle || DEFAULT_TEMPLATE.layoutStyle,
        organizationName: assignment.organization.name
      }
    },
    include: {
      employee: {
        select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } }
      },
      training: { select: { id: true, title: true } },
      organization: { select: { id: true, name: true, code: true } }
    }
  });

  return withId(certificate);
};

/**
 * Get count and details of completed assignments missing certificates for an Organization
 */
const getBackfillEligible = async (organizationId) => {
  const orgId = String(organizationId);

  const completedAssignments = await prisma.trainingAssignment.findMany({
    where: {
      organizationId: orgId,
      status: 'Completed',
      certificate: null
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      training: { select: { id: true, title: true } }
    },
    orderBy: { completedDate: 'desc' }
  });

  return {
    count: completedAssignments.length,
    assignments: withId(completedAssignments)
  };
};

/**
 * Backfill missing certificates for past completed assignments in an Organization
 */
const backfillMissingCertificates = async (organizationId) => {
  const { count, assignments } = await getBackfillEligible(organizationId);

  if (count === 0) {
    return { count: 0, generatedCertificates: [] };
  }

  const generatedCertificates = [];
  for (const assign of assignments) {
    try {
      const cert = await generateCertificateForAssignment(assign.id);
      if (cert) generatedCertificates.push(cert);
    } catch (err) {
      console.error(`Failed to backfill certificate for assignment ${assign.id}:`, err);
    }
  }

  return {
    count: generatedCertificates.length,
    generatedCertificates
  };
};

module.exports = {
  DEFAULT_TEMPLATE,
  getOrCreateTemplateSettings,
  generateCertificateForAssignment,
  getBackfillEligible,
  backfillMissingCertificates
};
