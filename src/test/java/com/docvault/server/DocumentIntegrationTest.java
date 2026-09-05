package com.docvault.server;

import com.docvault.server.dto.AuthRequest;
import com.docvault.server.dto.AuthResponse;
import com.docvault.server.dto.RegisterRequest;
import com.docvault.server.model.Document;
import com.docvault.server.repository.DocumentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class DocumentIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DocumentRepository documentRepository;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    private String registerAndLogin(String username, String email, String password) throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername(username);
        registerRequest.setEmail(email);
        registerRequest.setPassword(password);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername(username);
        authRequest.setPassword(password);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        return authResponse.getJwt();
    }

    @Test
    void shouldUploadProcessAndSearchDocumentWithMultiTenantIsolation() throws Exception {
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8);
        String aliceToken = registerAndLogin("alice_" + randomSuffix, "alice_" + randomSuffix + "@example.com", "Password123!");
        String bobToken = registerAndLogin("bob_" + randomSuffix, "bob_" + randomSuffix + "@example.com", "Password123!");

        // 1. Alice uploads a document
        String fileContent = "Confidential Q3 financial report containing secret revenue projections for DocVault company.";
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "q3_financial_report.txt",
                "text/plain",
                fileContent.getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("title", "Q3 Financial Report")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode uploadJson = objectMapper.readTree(uploadResult.getResponse().getContentAsString());
        UUID documentId = UUID.fromString(uploadJson.get("id").asText());
        assertEquals("PENDING", uploadJson.get("status").asText());

        // 2. Wait for async processing to complete
        Document updatedDoc = null;
        for (int i = 0; i < 40; i++) {
            updatedDoc = documentRepository.findById(documentId).orElse(null);
            if (updatedDoc != null && ("INDEXED".equals(updatedDoc.getStatus()) || "FAILED".equals(updatedDoc.getStatus()))) {
                break;
            }
            Thread.sleep(250);
        }

        // 3. Verify PostgreSQL document record updated
        assertNotNull(updatedDoc);
        assertEquals("INDEXED", updatedDoc.getStatus());
        assertNotNull(updatedDoc.getChecksum());
        assertEquals(64, updatedDoc.getChecksum().length(), "SHA-256 checksum must be 64 hex characters");
        assertNull(updatedDoc.getErrorMessage());
        assertNotNull(updatedDoc.getCategory(), "Document should be auto-categorized");
        assertEquals("Finance", updatedDoc.getCategory().getName());

        // 4. Test pre-flight checksum check
        MvcResult checkResult = mockMvc.perform(get("/api/documents/check-checksum")
                        .param("checksum", updatedDoc.getChecksum())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode checkJson = objectMapper.readTree(checkResult.getResponse().getContentAsString());
        assertTrue(checkJson.get("exists").asBoolean());
        assertEquals(documentId.toString(), checkJson.get("document").get("id").asText());

        // 5. Test categories listing
        MvcResult catResult = mockMvc.perform(get("/api/categories")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode catJson = objectMapper.readTree(catResult.getResponse().getContentAsString());
        assertTrue(catJson.size() > 0);
        assertEquals("Finance", catJson.get(0).get("name").asText());

        // Wait a brief moment for Elasticsearch index refresh if needed
        Thread.sleep(1000);

        // 6. Alice searches for "revenue projections"
        MvcResult searchResultAlice = mockMvc.perform(get("/api/documents/search")
                        .param("q", "revenue projections")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode searchJsonAlice = objectMapper.readTree(searchResultAlice.getResponse().getContentAsString());
        assertTrue(searchJsonAlice.get("totalHits").asLong() >= 1, "Alice should find the document");
        JsonNode firstHit = searchJsonAlice.get("items").get(0);
        assertEquals(documentId.toString(), firstHit.get("id").asText());
        assertEquals("Q3 Financial Report", firstHit.get("title").asText());
        assertEquals("Finance", firstHit.get("categoryName").asText());
        assertTrue(firstHit.get("highlights").size() > 0, "Should contain highlight snippets");
        String highlightSnippet = firstHit.get("highlights").get(0).asText();
        assertTrue(highlightSnippet.contains("<mark>"), "Highlight should contain mark tag");

        // 7. Bob searches for "revenue projections" -> Must return 0 hits (Multi-tenant security)
        MvcResult searchResultBob = mockMvc.perform(get("/api/documents/search")
                        .param("q", "revenue projections")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode searchJsonBob = objectMapper.readTree(searchResultBob.getResponse().getContentAsString());
        assertEquals(0, searchJsonBob.get("totalHits").asLong(), "Bob must NOT see Alice's document");

        // 8. Alice downloads document
        MvcResult downloadResult = mockMvc.perform(get("/api/documents/" + documentId + "/download")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"q3_financial_report.txt\""))
                .andReturn();

        assertEquals(fileContent, downloadResult.getResponse().getContentAsString());

        // 9. Alice deletes document
        mockMvc.perform(delete("/api/documents/" + documentId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNoContent());

        // Verify document removed from DB
        assertFalse(documentRepository.findById(documentId).isPresent());

        // Wait for ES refresh
        Thread.sleep(1000);

        // Verify removed from search
        MvcResult searchAfterDelete = mockMvc.perform(get("/api/documents/search")
                        .param("q", "revenue projections")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode searchAfterDeleteJson = objectMapper.readTree(searchAfterDelete.getResponse().getContentAsString());
        assertEquals(0, searchAfterDeleteJson.get("totalHits").asLong());
    }
}
