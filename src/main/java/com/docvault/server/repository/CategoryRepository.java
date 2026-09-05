package com.docvault.server.repository;

import com.docvault.server.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByUserIdOrderByNameAsc(UUID userId);

    @Query("SELECT c FROM Category c WHERE c.user.id = :userId AND LOWER(c.name) = LOWER(:name)")
    Optional<Category> findByUserIdAndNameIgnoreCase(@Param("userId") UUID userId, @Param("name") String name);

    Optional<Category> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT c, COUNT(d) FROM Category c LEFT JOIN Document d ON d.category.id = c.id WHERE c.user.id = :userId GROUP BY c")
    List<Object[]> findCategoriesWithCountByUserId(@Param("userId") UUID userId);
}
