package lifeos_backend.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Cached photo for a food, shared by all users (no user data in here).
 * Key is either a simplified food name ("chicken breast") or "upc:<barcode>".
 * A row with found=false remembers a miss so we do not ask the photo source again
 * for a while.
 */
@Entity
@Table(name = "food_images")
public class FoodImage {
    @Id
    @Column(length = 80)
    private String term;

    @Column(length = 500)
    private String url;
    @Column(length = 120)
    private String creditName;
    @Column(length = 500)
    private String creditUrl;
    @Column(length = 20)
    private String source;          // "pexels" or "openfoodfacts"
    private boolean found;
    private Instant fetchedAt;

    public FoodImage() {}

    public FoodImage(String term, String url, String creditName, String creditUrl, String source, boolean found) {
        this.term = term;
        this.url = url;
        this.creditName = creditName;
        this.creditUrl = creditUrl;
        this.source = source;
        this.found = found;
        this.fetchedAt = Instant.now();
    }

    public String getTerm() { return term; }
    public String getUrl() { return url; }
    public String getCreditName() { return creditName; }
    public String getCreditUrl() { return creditUrl; }
    public String getSource() { return source; }
    public boolean isFound() { return found; }
    public Instant getFetchedAt() { return fetchedAt; }
}
