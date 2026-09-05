package com.docvault.server.controller;

import com.docvault.server.dto.CategoryDto;
import com.docvault.server.model.Category;
import com.docvault.server.model.User;
import com.docvault.server.repository.CategoryRepository;
import com.docvault.server.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryController(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
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
}
