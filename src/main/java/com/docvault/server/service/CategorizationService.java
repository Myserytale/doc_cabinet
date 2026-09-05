package com.docvault.server.service;

import com.docvault.server.model.Category;
import com.docvault.server.model.User;
import com.docvault.server.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CategorizationService {

    private static final Logger log = LoggerFactory.getLogger(CategorizationService.class);

    private final CategoryRepository categoryRepository;

    private static final Map<String, CategoryDefinition> DEFINITIONS = new LinkedHashMap<>();

    private record CategoryDefinition(String name, String color, List<String> keywords) {}

    static {
        DEFINITIONS.put("Finance", new CategoryDefinition("Finance", "#10b981", List.of(
                "invoice", "receipt", "bill", "tax", "vat", "bank statement", "iban", "swift",
                "salary", "payroll", "balance sheet", "payment", "total due", "subtotal",
                "amount due", "quarterly", "financial", "revenue", "expense", "transaction"
        )));

        DEFINITIONS.put("Legal", new CategoryDefinition("Legal", "#6366f1", List.of(
                "contract", "agreement", "nda", "non-disclosure", "terms of service",
                "privacy policy", "clause", "jurisdiction", "parties", "hereby",
                "confidentiality", "license agreement", "settlement", "litigation", "liability"
        )));

        DEFINITIONS.put("Technical", new CategoryDefinition("Technical", "#3b82f6", List.of(
                "api", "architecture", "database", "docker", "kubernetes", "microservice",
                "algorithm", "git", "endpoint", "schema", "framework", "specification",
                "rfc", "backend", "frontend", "sdk", "deployment", "linux", "compiler"
        )));

        DEFINITIONS.put("Academic", new CategoryDefinition("Academic", "#8b5cf6", List.of(
                "abstract", "university", "journal", "proceedings", "doi", "references",
                "bibliography", "hypothesis", "methodology", "peer-reviewed", "citation",
                "dissertation", "thesis", "research paper"
        )));

        DEFINITIONS.put("Personal", new CategoryDefinition("Personal", "#ec4899", List.of(
                "resume", "curriculum vitae", "cv", "passport", "medical", "prescription",
                "patient", "health insurance", "boarding pass", "hotel reservation", "ticket"
        )));
    }

    public CategorizationService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /**
     * Determines category based on document title, filename, and extracted text.
     */
    public Category classifyAndAssign(User user, String title, String filename, String content) {
        String combined = (title + " " + filename + " " + (content != null ? content.substring(0, Math.min(content.length(), 20000)) : "")).toLowerCase();

        String bestCategoryName = null;
        int maxScore = 0;

        for (Map.Entry<String, CategoryDefinition> entry : DEFINITIONS.entrySet()) {
            int score = 0;
            for (String keyword : entry.getValue().keywords()) {
                if (combined.contains(keyword)) {
                    score += 1;
                    if (title.toLowerCase().contains(keyword) || filename.toLowerCase().contains(keyword)) {
                        score += 3;
                    }
                }
            }

            if (score > maxScore && score >= 2) {
                maxScore = score;
                bestCategoryName = entry.getKey();
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
