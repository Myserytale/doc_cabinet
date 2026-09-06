package com.docvault.server.service;

import com.docvault.server.model.Category;
import com.docvault.server.model.User;
import com.docvault.server.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class CategorizationService {

    private static final Logger log = LoggerFactory.getLogger(CategorizationService.class);

    private final CategoryRepository categoryRepository;

    private static final Map<String, CategoryDefinition> DEFINITIONS = new LinkedHashMap<>();

    private record CategoryDefinition(String name, String color, List<Pattern> patterns) {}

    private static final Pattern CV_OVERRIDE_PATTERN = Pattern.compile(
            "(?i).*(\\b(resume|curriculum[\\s_-]*vitae)\\b|(^|[\\s_-])cv([\\s_.-]|$)).*"
    );

    private static final Pattern ACADEMIC_TITLE_PATTERN = Pattern.compile(
            "(?i).*\\b(lecture|homework|assignment|syllabus|exam|quiz|coursework|exercise|lab)\\b.*"
    );

    static {
        DEFINITIONS.put("Finance", createDef("Finance", "#10b981", List.of(
                "invoice", "receipt", "billing", "bill", "tax", "vat", "bank statement", "iban", "swift",
                "salary", "payroll", "balance sheet", "total due", "subtotal", "amount due", "remittance",
                "financial statement", "payslip", "direct debit"
        )));

        DEFINITIONS.put("Legal", createDef("Legal", "#6366f1", List.of(
                "contract", "agreement", "nda", "non-disclosure", "terms of service",
                "privacy policy", "clause", "jurisdiction", "parties", "hereby",
                "confidentiality", "license agreement", "settlement", "litigation", "liability"
        )));

        DEFINITIONS.put("Technical", createDef("Technical", "#3b82f6", List.of(
                "api", "architecture", "database", "docker", "kubernetes", "microservice",
                "algorithm", "git", "endpoint", "schema", "framework", "specification",
                "rfc", "backend", "frontend", "sdk", "deployment", "linux", "compiler"
        )));

        DEFINITIONS.put("Academic", createDef("Academic", "#8b5cf6", List.of(
                "abstract", "university", "journal", "proceedings", "doi", "references",
                "bibliography", "hypothesis", "methodology", "peer-reviewed", "citation",
                "dissertation", "thesis", "research paper", "lecture", "probability", "statistics",
                "calculus", "algebra", "theorem", "proof", "lemma", "homework", "assignment",
                "syllabus", "course", "exam", "quiz", "exercise", "lab", "student", "faculty",
                "textbook", "chapter", "professor", "distribution", "variance", "random variable"
        )));

        DEFINITIONS.put("Personal", createDef("Personal", "#ec4899", List.of(
                "resume", "curriculum vitae", "cv", "passport", "medical", "prescription",
                "patient", "health insurance", "boarding pass", "hotel reservation", "ticket",
                "driver license", "driver's license", "id card"
        )));
    }

    private static CategoryDefinition createDef(String name, String color, List<String> keywords) {
        List<Pattern> patterns = keywords.stream()
                .map(kw -> Pattern.compile("\\b" + Pattern.quote(kw) + "\\b", Pattern.CASE_INSENSITIVE))
                .toList();
        return new CategoryDefinition(name, color, patterns);
    }

    public CategorizationService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /**
     * Determines category based on document title, filename, and extracted text.
     */
    public Category classifyAndAssign(User user, String title, String filename, String content) {
        String safeTitle = title != null ? title : "";
        String safeFilename = filename != null ? filename : "";
        String titleAndFilename = safeTitle + " " + safeFilename;

        // High confidence override: CV / Resume is always Personal
        if (CV_OVERRIDE_PATTERN.matcher(titleAndFilename).matches()) {
            log.info("Auto-categorized document '{}' as 'Personal' via CV/Resume pattern", filename);
            return getOrCreateCategory(user, "Personal");
        }

        String sampleContent = content != null ? content.substring(0, Math.min(content.length(), 25000)) : "";
        String combined = titleAndFilename + "\n" + sampleContent;

        String bestCategoryName = null;
        int maxScore = 0;

        for (Map.Entry<String, CategoryDefinition> entry : DEFINITIONS.entrySet()) {
            String catName = entry.getKey();
            int score = 0;

            // Academic title bonus
            if ("Academic".equals(catName) && ACADEMIC_TITLE_PATTERN.matcher(titleAndFilename).find()) {
                score += 8;
            }

            for (Pattern pattern : entry.getValue().patterns()) {
                if (pattern.matcher(combined).find()) {
                    score += 1;
                    if (pattern.matcher(titleAndFilename).find()) {
                        score += 3;
                    }
                }
            }

            if (score > maxScore && score >= 2) {
                maxScore = score;
                bestCategoryName = catName;
            }
        }

        if (bestCategoryName == null) {
            return null;
        }

        log.info("Auto-categorized document '{}' as '{}' (confidence score: {})", filename, bestCategoryName, maxScore);
        return getOrCreateCategory(user, bestCategoryName);
    }

    public synchronized Category getOrCreateCategory(User user, String categoryName) {
        Optional<Category> existing = categoryRepository.findByUserIdAndNameIgnoreCase(user.getId(), categoryName);
        if (existing.isPresent()) {
            return existing.get();
        }

        try {
            CategoryDefinition def = DEFINITIONS.get(categoryName);
            String color = def != null ? def.color() : "#6366f1";
            Category newCat = new Category(user, categoryName, color);
            return categoryRepository.save(newCat);
        } catch (DataIntegrityViolationException e) {
            return categoryRepository.findByUserIdAndNameIgnoreCase(user.getId(), categoryName)
                    .orElseThrow(() -> new RuntimeException("Failed to find or create category: " + categoryName, e));
        }
    }
}
