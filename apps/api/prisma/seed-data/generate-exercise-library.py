import json
import re

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

# ---------------------------------------------------------------------------
# Source taxonomy (transcribed from the RISESOLO exercise plan)
# ---------------------------------------------------------------------------

CALISTHENICS_TREE = {
    "CHEST": {
        "BEGINNER": ["Wall Push-Up", "Incline Push-Up", "Knee Push-Up", "Standard Push-Up"],
        "INTERMEDIATE": ["Wide Push-Up", "Diamond Push-Up", "Decline Push-Up", "Archer Push-Up", "Pseudo Planche Push-Up"],
        "ADVANCED": ["One-Arm Push-Up", "Typewriter Push-Up", "Explosive Push-Up", "Clap Push-Up", "Planche Push-Up"],
    },
    "BACK": {
        "BEGINNER": ["Scapular Pull-Up", "Dead Hang", "Australian Row", "Resistance-Free Row", "Assisted Pull-Up"],
        "INTERMEDIATE": ["Pull-Up", "Chin-Up", "Wide-Grip Pull-Up", "Close-Grip Pull-Up", "Neutral-Grip Pull-Up", "Commando Pull-Up"],
        "ADVANCED": ["Archer Pull-Up", "Typewriter Pull-Up", "Chest-to-Bar Pull-Up", "Explosive Pull-Up", "Muscle-Up", "One-Arm Pull-Up"],
    },
    "SHOULDERS": {
        "BEGINNER": ["Pike Hold", "Incline Pike Push-Up", "Pike Push-Up", "Scapular Push-Up"],
        "INTERMEDIATE": ["Elevated Pike Push-Up", "Wall Handstand Hold", "Wall Handstand Push-Up", "Handstand"],
        "ADVANCED": ["Freestanding Handstand Push-Up", "Deficit Handstand Push-Up", "Handstand Push-Up", "Planche Lean", "Full Planche"],
    },
    "CORE": {
        "BEGINNER": ["Dead Bug", "Bird Dog", "Plank", "Side Plank", "Knee Tuck"],
        "INTERMEDIATE": ["Mountain Climber", "Reverse Crunch", "Leg Raise", "Hanging Knee Raise", "Hollow Body Hold", "L-Sit Tuck"],
        "ADVANCED": ["Hanging Leg Raise", "Toes-to-Bar", "V-Sit", "L-Sit", "Dragon Flag", "Front Lever Tuck", "Front Lever"],
    },
    "FULL_BODY": {
        "BEGINNER": ["Bodyweight Squat", "Push-Up", "Reverse Lunge", "Mountain Climber", "Bear Crawl"],
        "INTERMEDIATE": ["Burpee", "Jump Squat", "Broad Jump", "Bear Crawl", "Crab Walk", "Pull-Up + Knee Raise"],
        "ADVANCED": ["Muscle-Up", "Handstand Push-Up", "Pistol Squat", "Human Flag", "Front Lever", "Back Lever", "Planche", "One-Arm Push-Up"],
    },
}

CALISTHENICS_ARMS = {
    "BICEPS": ["Australian Chin-Up", "Chin-Up", "Close-Grip Chin-Up", "Archer Chin-Up", "One-Arm Chin-Up"],
    "TRICEPS": ["Bench Dip", "Parallel Bar Dip", "Straight Bar Dip", "Korean Dip", "Diamond Push-Up", "Tiger Bend Push-Up", "Impossible Dip"],
}

CALISTHENICS_LEGS = {
    "QUADRICEPS": ["Bodyweight Squat", "Narrow Squat", "Split Squat", "Reverse Lunge", "Walking Lunge", "Bulgarian Split Squat", "Assisted Pistol Squat", "Pistol Squat"],
    "HAMSTRINGS": ["Glute Bridge", "Single-Leg Glute Bridge", "Hamstring Walkout", "Nordic Curl Progression", "Nordic Hamstring Curl"],
    "GLUTES": ["Glute Bridge", "Single-Leg Glute Bridge", "Hip Thrust", "Bulgarian Split Squat", "Step-Up", "Single-Leg Hip Thrust"],
    "CALVES": ["Standing Calf Raise", "Single-Leg Calf Raise", "Jump Rope", "Calf Pulses", "Explosive Calf Raise"],
}

SKILLS_TREE = {
    "FOUNDATIONS": ["Dead Hang", "Active Hang", "Scapular Pull-Up", "Hollow Body", "Arch Body", "Support Hold"],
    "HANDSTAND": ["Wall Handstand", "Freestanding Handstand", "Handstand Shoulder Tap", "Handstand Push-Up"],
    "L_SIT": ["Tuck Sit", "One-Leg L-Sit", "L-Sit", "V-Sit"],
    "FRONT_LEVER": ["Tuck Front Lever", "Advanced Tuck Front Lever", "One-Leg Front Lever", "Straddle Front Lever", "Full Front Lever"],
    "BACK_LEVER": ["Skin the Cat", "Tuck Back Lever", "Advanced Tuck Back Lever", "Straddle Back Lever", "Full Back Lever"],
    "PLANCHE": ["Planche Lean", "Frog Stand", "Tuck Planche", "Advanced Tuck Planche", "Straddle Planche", "Full Planche"],
    "HUMAN_FLAG": ["Vertical Flag Hold", "Tuck Flag", "One-Leg Flag", "Straddle Flag", "Full Human Flag"],
    "MUSCLE_UP": ["Scapular Pull-Up", "Explosive Pull-Up", "Chest-to-Bar Pull-Up", "Band-Assisted Muscle-Up", "Jumping Muscle-Up", "Muscle-Up"],
}

GYM_TREE = {
    "CHEST": ["Push-Up", "Wide Push-Up", "Incline Push-Up", "Decline Push-Up", "Diamond Push-Up",
              "Dumbbell Chest Press", "Dumbbell Incline Chest Press", "Dumbbell Fly", "Incline Dumbbell Fly",
              "Barbell Bench Press", "Incline Bench Press", "Decline Bench Press", "Chest Fly Machine",
              "Cable Chest Fly", "Dumbbell Pullover"],
    "BACK": ["Superman", "Bird Dog", "Resistance Band Row", "Dumbbell Row", "Bent-Over Row",
             "One-Arm Dumbbell Row", "Barbell Row", "Seated Cable Row", "Lat Pulldown",
             "Close-Grip Lat Pulldown", "Wide-Grip Lat Pulldown", "Assisted Pull-Up", "Pull-Up",
             "Chin-Up", "Inverted Row", "Face Pull", "Dumbbell Reverse Fly"],
    "SHOULDERS": ["Arm Circles", "Pike Push-Up", "Dumbbell Shoulder Press", "Seated Dumbbell Press",
                  "Arnold Press", "Dumbbell Lateral Raise", "Cable Lateral Raise", "Front Raise",
                  "Rear Delt Fly", "Cable Rear Delt Fly", "Upright Row", "Push Press", "Dumbbell Y-Raise"],
    "CORE": ["Plank", "Forearm Plank", "Side Plank", "Plank Shoulder Tap", "High Plank", "Dead Bug",
             "Bird Dog", "Glute Bridge", "Bicycle Crunch", "Crunch", "Reverse Crunch", "Leg Raise",
             "Hanging Leg Raise", "Mountain Climber", "Russian Twist", "Heel Taps", "V-Up",
             "Hollow Body Hold", "Bear Crawl", "Dumbbell Russian Twist"],
    "FULL_BODY": ["Burpee", "Squat to Press", "Thruster", "Dumbbell Thruster", "Kettlebell Swing",
                  "Dumbbell Clean", "Dumbbell Snatch", "Man Maker", "Bear Crawl", "Mountain Climber",
                  "Turkish Get-Up", "Renegade Row", "Walking Lunge + Curl", "Squat + Calf Raise",
                  "Deadlift + Row", "Push-Up + Row", "Squat + Shoulder Press", "Devil Press"],
}

GYM_ARMS = {
    "BICEPS": ["Dumbbell Curl", "Alternating Dumbbell Curl", "Hammer Curl", "Incline Dumbbell Curl",
               "Concentration Curl", "Cable Curl", "Barbell Curl"],
    "TRICEPS": ["Bench Dip", "Triceps Dip", "Close-Grip Push-Up", "Dumbbell Overhead Triceps Extension",
                "Dumbbell Triceps Kickback", "Cable Triceps Pushdown", "Rope Pushdown", "Skull Crusher"],
}

GYM_LEGS = {
    "QUADRICEPS": ["Bodyweight Squat", "Goblet Squat", "Dumbbell Squat", "Barbell Back Squat", "Front Squat",
                   "Split Squat", "Bulgarian Split Squat", "Leg Press"],
    "HAMSTRINGS": ["Glute Bridge", "Single-Leg Glute Bridge", "Romanian Deadlift", "Dumbbell Romanian Deadlift",
                   "Barbell Romanian Deadlift", "Leg Curl"],
    "GLUTES": ["Glute Bridge", "Hip Thrust", "Single-Leg Hip Thrust", "Reverse Lunge", "Walking Lunge",
               "Bulgarian Split Squat", "Step-Up", "Cable Kickback"],
    "CALVES": ["Standing Calf Raise", "Seated Calf Raise", "Single-Leg Calf Raise"],
}

# ---------------------------------------------------------------------------
# Metadata inference rules
# ---------------------------------------------------------------------------

MUSCLES = {
    ("CHEST", None): (["Pectoralis Major"], ["Anterior Deltoid", "Triceps Brachii"]),
    ("BACK", None): (["Latissimus Dorsi", "Trapezius"], ["Biceps Brachii", "Rear Deltoid", "Rhomboids"]),
    ("SHOULDERS", None): (["Deltoids"], ["Trapezius", "Triceps Brachii", "Serratus Anterior"]),
    ("ARMS", "BICEPS"): (["Biceps Brachii"], ["Brachialis", "Forearm Flexors"]),
    ("ARMS", "TRICEPS"): (["Triceps Brachii"], ["Anterior Deltoid", "Pectoralis Major"]),
    ("LEGS", "QUADRICEPS"): (["Quadriceps"], ["Glutes", "Adductors"]),
    ("LEGS", "HAMSTRINGS"): (["Hamstrings"], ["Glutes", "Lower Back"]),
    ("LEGS", "GLUTES"): (["Glutes"], ["Hamstrings", "Quadriceps"]),
    ("LEGS", "CALVES"): (["Calves"], []),
    ("CORE", None): (["Rectus Abdominis", "Obliques"], ["Hip Flexors", "Lower Back"]),
    ("FULL_BODY", None): (["Full Body"], ["Cardiovascular System"]),
}

SKILL_MUSCLES = {
    "FOUNDATIONS": (["Latissimus Dorsi", "Forearm Flexors"], ["Core", "Shoulders"]),
    "HANDSTAND": (["Deltoids"], ["Triceps Brachii", "Core", "Trapezius"]),
    "L_SIT": (["Rectus Abdominis", "Hip Flexors"], ["Triceps Brachii", "Quadriceps"]),
    "FRONT_LEVER": (["Latissimus Dorsi", "Rectus Abdominis"], ["Biceps Brachii", "Rear Deltoid"]),
    "BACK_LEVER": (["Latissimus Dorsi", "Rear Deltoid"], ["Rectus Abdominis", "Biceps Brachii"]),
    "PLANCHE": (["Anterior Deltoid", "Pectoralis Major"], ["Rectus Abdominis", "Triceps Brachii", "Serratus Anterior"]),
    "HUMAN_FLAG": (["Obliques", "Latissimus Dorsi"], ["Deltoids", "Triceps Brachii"]),
    "MUSCLE_UP": (["Latissimus Dorsi", "Triceps Brachii"], ["Biceps Brachii", "Pectoralis Major", "Deltoids"]),
}

EQUIPMENT_RULES = [
    (r"dumbbell", "DUMBBELL"),
    (r"barbell", "BARBELL"),
    (r"kettlebell", "KETTLEBELL"),
    (r"\bcable\b", "CABLE"),
    (r"machine", "MACHINE"),
    (r"resistance band|\bband\b", "RESISTANCE_BAND"),
    (r"jump rope", "JUMP_ROPE"),
    (r"bench dip|bench press|incline bench|decline bench|seated", "BENCH"),
    (r"pull-up|chin-up|dead hang|active hang|hang|muscle-up|typewriter|archer (pull|chin)|commando|front lever|back lever|skin the cat|human flag|flag|toes-to-bar|hanging", "PULL_UP_BAR"),
    (r"parallel bar dip|straight bar dip|korean dip|impossible dip|\bdip\b", "PARALLEL_BARS"),
]

MOVEMENT_PATTERN_RULES = [
    (r"push-up|press|dip|extension|pushdown|push press", "push"),
    (r"pull-up|chin-up|row|curl|pulldown|face pull", "pull"),
    (r"squat|lunge|step-up|pistol", "squat"),
    (r"deadlift|hip thrust|bridge|swing|clean|snatch", "hinge"),
    (r"plank|hold|hang|lever|flag|planche|l-sit|v-sit|handstand|frog stand|skin the cat|support", "isometric_hold"),
    (r"crunch|raise|twist|climber|dead bug|bird dog|tuck", "core_dynamic"),
    (r"burpee|jump|broad jump|sprint|crawl|walk|get-up|man maker|devil press|thruster", "full_body_dynamic"),
]

INSTRUCTION_TEMPLATES = {
    "push": [
        "Namesti telo u polaznu poziciju sa stabilnim oslonom za {equipment_hint}.",
        "Spusti telo kontrolisano dok se ne postigne puna amplituda pokreta za {name}.",
        "Eksplozivno ili kontrolisano gurni nazad u pocetnu poziciju, izdisi pri naporu.",
        "Drzi jezgro (core) napregnuto tokom celog pokreta da zastitis donji deo ledja.",
    ],
    "pull": [
        "Uhvati oslonac/rucku sa kontrolisanim, stabilnim hvatom.",
        "Povuci telo/teg ka sebi vodeci pokret laktovima, ne trzajem.",
        "Stisni lopatice na vrhu pokreta pre kontrolisanog spustanja.",
        "Izbegavaj ljuljanje tela - pokret izvodi ciljna muskulatura, ne inercija.",
    ],
    "squat": [
        "Stopala u sirini kukova, prsti blago okrenuti napolje.",
        "Spusti kukove unazad i dole, kolena prate pravac stopala.",
        "Spusti se do paralele (ili dublje ako mobilnost dozvoljava) drzeci ledja neutralno.",
        "Gurni kroz pete nazad u stojeci polozaj.",
    ],
    "hinge": [
        "Poloz noge u sirini kukova, blago savijena kolena.",
        "Savij se u kuku (hip hinge) drzeci ledja neutralno, teg/telo blizu tela.",
        "Osecaj istezanje u zadnjoj loži tokom spustanja.",
        "Vrati se u uspravan polozaj kontrakcijom glutea, ne ledjima.",
    ],
    "isometric_hold": [
        "Uspostavi ciljnu poziciju uz kontrolisan ulazak (bez trzaja).",
        "Napregni core, gluteus i ciljne mišićne grupe da stabilizujes poziciju.",
        "Drzi zadati vremenski interval sa mirnim, kontrolisanim disanjem.",
        "Izadji iz pozicije kontrolisano cim forma pocne da se narusava.",
    ],
    "core_dynamic": [
        "Poloz na leđima ili u planku, kicma u neutralnoj poziciji.",
        "Izvedi pokret kontrolisano fokusirajuci se na kontrakciju trbusnih misica.",
        "Izbegavaj povlacenje vrata ili zamah nogama umesto core kontrakcije.",
        "Vrati se u pocetnu poziciju bez gubljenja napetosti u jezgru.",
    ],
    "full_body_dynamic": [
        "Zapocni iz stabilne pocetne pozicije sa napregnutim jezgrom.",
        "Izvedi pokret eksplozivno ali kontrolisano kroz punu amplitudu.",
        "Odrzavaj ritam disanja usaglasen sa fazama pokreta.",
        "Sleti/vrati se u pocetnu poziciju meko, amortizujuci zglobove.",
    ],
}

FORM_CUES = {
    "push": ["Laktovi pod ~45 stepeni, ne pravougaono od tela", "Ravna linija glava-kukovi-pete"],
    "pull": ["Lopatice povuci dole-nazad pre pokreta", "Hvat cvrst ali bez napetosti u ramenima do pokreta"],
    "squat": ["Kolena prate liniju stopala", "Tezina ravnomerno na celom stopalu"],
    "hinge": ["Kicma neutralna tokom celog pokreta", "Pokret vodi kuk, ne ledja"],
    "isometric_hold": ["Disi mirno, ne zadrzavaj dah", "Mikro-korekcije umesto potpunog gubljenja forme"],
    "core_dynamic": ["Izdah na kontrakciji", "Donja ledja ostaju u kontaktu s podlogom (gde je primenjivo)"],
    "full_body_dynamic": ["Kontrolisi tempo, ne zrtvuj formu za brzinu", "Meko doskoci/vrati se u poziciju"],
}

SAFETY_NOTES = {
    "push": ["Ako oseti bol u ramenu, smanji amplitudu ili predji na laksu progresiju."],
    "pull": ["Izbegavaj potpuno zakljucavanje lakta pod opterecenjem ako oseti nelagodu u zglobu."],
    "squat": ["Ne dozvoli da kolena upadaju unutra (valgus) - prati liniju stopala."],
    "hinge": ["Nikad ne zaobli donji deo ledja pod opterecenjem - smanji tezinu/amplitudu."],
    "isometric_hold": ["Prekini drzanje odmah ako forma pocne znacajno da se narusava."],
    "core_dynamic": ["Ako oseti pritisak/bol u donjem delu ledja, smanji amplitudu pokreta nogu."],
    "full_body_dynamic": ["Zagrej se pre eksplozivnih/plyometric varijanti; kontrolisi doskok."],
}

DIFFICULTY_DEFAULT_PRESCRIPTION = {
    "BEGINNER": {"sets": 3, "reps": "8-12", "hold_seconds": 20, "rest_seconds": 45},
    "INTERMEDIATE": {"sets": 3, "reps": "10-15", "hold_seconds": 30, "rest_seconds": 60},
    "ADVANCED": {"sets": 4, "reps": "6-10", "hold_seconds": 45, "rest_seconds": 90},
}

HOLD_KEYWORDS = re.compile(r"hold|hang|plank|lever|flag|planche|l-sit|v-sit|handstand(?! push-up)|frog stand|skin the cat|support|dead hang|active hang|arch body|hollow body")


def detect_equipment(name):
    lname = name.lower()
    for pattern, equip in EQUIPMENT_RULES:
        if re.search(pattern, lname):
            return equip
    return "BODYWEIGHT"


def detect_movement_pattern(name):
    lname = name.lower()
    for pattern, mp in MOVEMENT_PATTERN_RULES:
        if re.search(pattern, lname):
            return mp
    return "full_body_dynamic"


def is_hold_exercise(name):
    return bool(HOLD_KEYWORDS.search(name.lower()))


def build_instructions(name, movement_pattern, equipment):
    equipment_hint = equipment.replace("_", " ").lower()
    return [t.format(name=name, equipment_hint=equipment_hint) for t in INSTRUCTION_TEMPLATES[movement_pattern]]


def build_prescription(difficulty, name):
    base = dict(DIFFICULTY_DEFAULT_PRESCRIPTION[difficulty])
    if is_hold_exercise(name):
        return {
            "sets": base["sets"],
            "reps": None,
            "hold_seconds": base["hold_seconds"],
            "rest_seconds": base["rest_seconds"],
        }
    return {
        "sets": base["sets"],
        "reps": base["reps"],
        "hold_seconds": None,
        "rest_seconds": base["rest_seconds"],
    }


def make_exercise(name, category, subcategory, difficulty, ex_type, chain=None, order=None, skill_key=None):
    slug_parts = [category.lower().replace("_", "-")]
    if subcategory:
        slug_parts.append(subcategory.lower().replace("_", "-"))
    slug_parts.append(slugify(name))
    slug = "-".join(slug_parts)

    equipment = detect_equipment(name)
    movement_pattern = detect_movement_pattern(name)

    if ex_type == "SKILL":
        primary, secondary = SKILL_MUSCLES.get(skill_key, (["Full Body"], []))
    else:
        primary, secondary = MUSCLES.get((category, subcategory), (["Full Body"], []))

    prescription = build_prescription(difficulty, name)

    return {
        "slug": slug,
        "name": name,
        "category": category,
        "subcategory": subcategory,
        "type": ex_type,
        "difficulty": difficulty,
        "equipment": equipment,
        "movement_pattern": movement_pattern,
        "primary_muscles": primary,
        "secondary_muscles": secondary,
        "instructions": build_instructions(name, movement_pattern, equipment),
        "form_cues": FORM_CUES[movement_pattern],
        "safety_notes": SAFETY_NOTES[movement_pattern],
        "default_prescription": prescription,
        "progression": {
            "chain": chain,
            "order": order,
        } if chain else None,
    }


def dedup_add(bucket, exercise):
    """Add exercise if slug not already present (keeps first occurrence)."""
    if exercise["slug"] not in bucket:
        bucket[exercise["slug"]] = exercise


def build_library():
    exercises = {}

    # Calisthenics main tree (chest/back/shoulders/core/full body) with tiers
    for category, tiers in CALISTHENICS_TREE.items():
        for difficulty, names in tiers.items():
            for order, name in enumerate(names, start=1):
                chain = f"calisthenics-{category.lower()}"
                ex = make_exercise(name, category, None, difficulty, "CALISTHENICS", chain=chain, order=order)
                dedup_add(exercises, ex)

    # Calisthenics arms (biceps/triceps) - single list each, no explicit tier -> INTERMEDIATE default
    for subcat, names in CALISTHENICS_ARMS.items():
        for order, name in enumerate(names, start=1):
            chain = f"calisthenics-arms-{subcat.lower()}"
            ex = make_exercise(name, "ARMS", subcat, "INTERMEDIATE", "CALISTHENICS", chain=chain, order=order)
            dedup_add(exercises, ex)

    # Calisthenics legs (quads/hamstrings/glutes/calves)
    for subcat, names in CALISTHENICS_LEGS.items():
        for order, name in enumerate(names, start=1):
            chain = f"calisthenics-legs-{subcat.lower()}"
            ex = make_exercise(name, "LEGS", subcat, "INTERMEDIATE", "CALISTHENICS", chain=chain, order=order)
            dedup_add(exercises, ex)

    # Skills tree - progression chains, difficulty derived from order in chain
    for chain_key, names in SKILLS_TREE.items():
        n = len(names)
        for order, name in enumerate(names, start=1):
            if order <= max(1, n // 3):
                difficulty = "BEGINNER"
            elif order <= max(2, (2 * n) // 3):
                difficulty = "INTERMEDIATE"
            else:
                difficulty = "ADVANCED"
            chain = f"skill-{chain_key.lower().replace('_', '-')}"
            ex = make_exercise(name, "SKILLS", chain_key, difficulty, "SKILL", chain=chain, order=order, skill_key=chain_key)
            dedup_add(exercises, ex)

    # Gym tree (chest/back/shoulders/core/full body) - flat lists, no explicit tier.
    # Assign difficulty heuristically: first third beginner, middle third intermediate, last third advanced,
    # respecting original order (which the source list already roughly orders by complexity).
    for category, names in GYM_TREE.items():
        n = len(names)
        for order, name in enumerate(names, start=1):
            if order <= max(1, n // 3):
                difficulty = "BEGINNER"
            elif order <= max(2, (2 * n) // 3):
                difficulty = "INTERMEDIATE"
            else:
                difficulty = "ADVANCED"
            ex = make_exercise(name, category, None, difficulty, "GYM")
            dedup_add(exercises, ex)

    for subcat, names in GYM_ARMS.items():
        n = len(names)
        for order, name in enumerate(names, start=1):
            difficulty = "BEGINNER" if order <= n // 3 else ("INTERMEDIATE" if order <= (2 * n) // 3 else "ADVANCED")
            ex = make_exercise(name, "ARMS", subcat, difficulty, "GYM")
            dedup_add(exercises, ex)

    for subcat, names in GYM_LEGS.items():
        n = len(names)
        for order, name in enumerate(names, start=1):
            difficulty = "BEGINNER" if order <= n // 3 else ("INTERMEDIATE" if order <= (2 * n) // 3 else "ADVANCED")
            ex = make_exercise(name, "LEGS", subcat, difficulty, "GYM")
            dedup_add(exercises, ex)

    return list(exercises.values())


if __name__ == "__main__":
    library = build_library()
    print(f"Total exercises: {len(library)}")
    by_type = {}
    for e in library:
        by_type.setdefault(e["type"], 0)
        by_type[e["type"]] += 1
    print("By type:", by_type)
    with open("/tmp/claude-0/-home-user-RISESOLO/d026cf1d-a492-5090-bffd-453dd4f465db/scratchpad/exercise-library.json", "w", encoding="utf-8") as f:
        json.dump(library, f, ensure_ascii=False, indent=2)
    print("Written.")
