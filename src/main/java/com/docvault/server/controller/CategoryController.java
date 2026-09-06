package com.docvault.server.controller;

import com.docvault.server.dto.CategoryDto;
import com.docvault.server.model.Category;
import com.docvault.server.model.Document;
import com.docvault.server.model.User;
import com.docvault.server.repository.CategoryRepository;
import com.docvault.server.repository.DocumentRepository;
import com.docvault.server.repository.UserRepository;
import com.docvault.server.service.SearchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final SearchService searchService;

    public CategoryController(CategoryRepository categoryRepository,
                              UserRepository userRepository,
                              DocumentRepository documentRepository,
                              SearchService searchService) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.searchService = searchService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByUsername(username).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<List<CategoryDto>> getCategories() {
        User user = getCurrentUser();
        List<Object[]> results = categoryRepository.findCategoriesWithCountByUserId(user.getId());
        List<CategoryDto> dtos = results.stream().map(row -> {
            Category cat = (Category) row[0];
            Long count = (Long) row[1];
            return new CategoryDto(cat.getId(), cat.getName(), cat.getColor(), count != null ? count : 0L);
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    public record CreateCategoryRequest(String name, String color) {}

    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody CreateCategoryRequest request) {
        User user = getCurrentUser();
        if (request == null || request.name() == null || request.name().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Category name is required");
        }

        String trimmedName = request.name().trim();
        Optional<Category> existing = categoryRepository.findByUserIdAndNameIgnoreCase(user.getId(), trimmedName);
        if (existing.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Category '" + trimmedName + "' already exists");
        }

        String color = (request.color() != null && !request.color().trim().isEmpty()) ? request.color().trim() : "#6366f1";
        Category category = new Category(user, trimmedName, color);
        Category saved = categoryRepository.save(category);

        return ResponseEntity.status(HttpStatus.CREATED).body(new CategoryDto(saved.getId(), saved.getName(), saved.getColor(), 0L));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable UUID id) {
        User user = getCurrentUser();
        Optional<Category> catOpt = categoryRepository.findByIdAndUserId(id, user.getId());
        if (catOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Category category = catOpt.get();

        // Clear category on all documents referencing it
        List<Document> docs = documentRepository.findByUserIdAndCategoryIdOrderByCreatedAtDesc(user.getId(), id);
        for (Document doc : docs) {
            doc.setCategory(null);
            searchService.updateDocumentCategory(doc.getId().toString(), null, null);
        }
        documentRepository.saveAll(docs);

        categoryRepository.delete(category);
        return ResponseEntity.noContent().build();
    }
}
