package lifeos_backend.service;

import lifeos_backend.model.WeightEntity;
import lifeos_backend.repository.WeightRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class WeightService {

    private final WeightRepository weightRepository;

    public WeightService(WeightRepository weightRepository) {
        this.weightRepository = weightRepository;
    }

    public WeightEntity logWeight(WeightEntity entity) {
        return weightRepository.save(entity);
    }

    public List<WeightEntity> getWeightsByUser(Long userId) {
        return weightRepository.findByUserIdOrderByDateDesc(userId);
    }

    public void deleteWeight(Long id) {
        weightRepository.deleteById(id);
    }
}