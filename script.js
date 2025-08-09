// GitHub username
const GITHUB_USERNAME = 'gajedi1';

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links li');

    // Toggle mobile menu
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    // Close mobile menu when clicking on a nav link
    navLinksItems.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add active class to nav links on scroll
    const sections = document.querySelectorAll('section');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinksItems.forEach(li => {
            li.querySelector('a').classList.remove('active');
            if (li.querySelector(`a[href="#${current}"]`)) {
                li.querySelector('a').classList.add('active');
            }
        });
    });

    // Add animation on scroll
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.classList.add('animate');
            }
        });
        
        // Animate skill bars when in view
        const skillBars = document.querySelectorAll('.skill-item');
        skillBars.forEach(bar => {
            const barTop = bar.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (barTop < windowHeight - 50) {
                const skillLevel = bar.getAttribute('data-skill');
                const levelElement = bar.querySelector('.skill-level');
                if (levelElement) {
                    levelElement.style.width = `${skillLevel}%`;
                }
            }
        });
    };
    
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on page load

    // Fetch GitHub projects with better error handling
    async function fetchGitHubProjects() {
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid) return;
        
        // Show loading state
        projectsGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading projects from GitHub...</p>
            </div>
        `;
        
        try {
            // First, get the list of repositories
            const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
            
            // Check if the response is ok (status 200-299)
            if (!reposResponse.ok) {
                const errorData = await reposResponse.json().catch(() => ({}));
                const error = new Error(`GitHub API error: ${reposResponse.status} ${reposResponse.statusText}`);
                error.details = {
                    status: reposResponse.status,
                    statusText: reposResponse.statusText,
                    message: errorData.message || 'Unknown error',
                    type: 'api_error'
                };
                throw error;
            }
            
            let repos;
            try {
                repos = await reposResponse.json();
            } catch (parseError) {
                console.error('Error parsing GitHub API response:', parseError);
                throw new Error('Failed to parse GitHub API response');
            }
            
            // If no repos or empty array
            if (!repos || !Array.isArray(repos) || repos.length === 0) {
                const error = new Error('No repositories found');
                error.details = { type: 'no_repos' };
                throw error;
            }
            
            // Filter out forked repos and sort by stars
            const filteredRepos = repos
                .filter(repo => !repo.fork && !repo.archived)
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 6);
                
            console.log('Filtered repositories:', filteredRepos);
            
            if (filteredRepos.length === 0) {
                const error = new Error('No non-forked repositories found');
                error.details = { type: 'no_valid_repos' };
                throw error;
            }
            
            // Fetch languages for each repository
            const projectsWithLanguages = await Promise.all(
                filteredRepos.map(async repo => {
                    try {
                        const languagesResponse = await fetch(repo.languages_url);
                        if (!languagesResponse.ok) {
                            console.warn(`Failed to fetch languages for ${repo.name}: ${languagesResponse.status}`);
                            return { ...repo, all_languages: ['Code'] };
                        }
                        const languages = await languagesResponse.json();
                        return {
                            ...repo,
                            all_languages: Object.keys(languages).length > 0 ? Object.keys(languages) : ['Code']
                        };
                    } catch (error) {
                        console.warn(`Error fetching languages for ${repo.name}:`, error);
                        return { ...repo, all_languages: ['Code'] };
                    }
                })
            );
            
            console.log('Projects with languages:', projectsWithLanguages);
            displayProjects(projectsWithLanguages);
            
        } catch (error) {
            console.error('Error in fetchGitHubProjects:', error);
            showApiError(error);
        }
    }
    
    // Format project name (convert kebab-case to Title Case)
    function formatProjectName(name) {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function displayProjects(projects) {
        const projectsGrid = document.querySelector('.projects-grid');
        
        if (!projectsGrid) return;
        
        // Clear loading/fallback content
        projectsGrid.innerHTML = '';
        
        projects.forEach((project, index) => {
            // Format date
            const updatedAt = new Date(project.updated_at);
            const formattedDate = updatedAt.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short',
                day: 'numeric'
            });
            
            // Get all languages or default
            const languages = project.all_languages && project.all_languages.length > 0 
                ? project.all_languages 
                : ['Code'];
            
            // Format the description to handle null/undefined and add ellipsis if too long
            const maxDescriptionLength = 120;
            let description = project.description || 'No description available.';
            if (description.length > maxDescriptionLength) {
                description = description.substring(0, maxDescriptionLength) + '...';
            }
            
            // Create language tags
            const languageTags = languages
                .slice(0, 3) // Show max 3 languages
                .map(lang => `
                    <span class="tech-tag">${lang}</span>
                `)
                .join('');
                
            // Add +X more if there are more than 3 languages
            const moreLanguages = languages.length > 3 
                ? `<span class="tech-tag more-languages" title="${languages.slice(3).join(', ')}">+${languages.length - 3} more</span>` 
                : '';
            
            // Create project card element
            const projectElement = document.createElement('div');
            projectElement.className = 'project-card animate-on-scroll';
            projectElement.setAttribute('data-animation', 'fade-in-up');
            projectElement.setAttribute('data-delay', (index * 0.1).toString());
            
            // Set inner HTML for the project card
            projectElement.innerHTML = `
                <div class="project-card-inner">
                    <div class="project-header">
                        <div class="project-folder">
                            <i class="far fa-folder"></i>
                        </div>
                        <div class="project-links">
                            ${project.homepage ? `<a href="${project.homepage}" target="_blank" rel="noopener noreferrer" title="View Live Demo"><i class="fas fa-external-link-alt"></i></a>` : ''}
                            <a href="${project.html_url}" target="_blank" rel="noopener noreferrer" title="View on GitHub"><i class="fab fa-github"></i></a>
                        </div>
                    </div>
                    <h3>${formatProjectName(project.name)}</h3>
                    <p>${description}</p>
                    <div class="project-footer">
                        <div class="project-languages">
                            ${languageTags}
                            ${moreLanguages}
                        </div>
                    </div>
                </div>
            `;
            
            // Add the project card to the grid
            projectsGrid.appendChild(projectElement);
            
            projectsGrid.appendChild(projectElement);
        });
    }
    
    function showApiError(error) {
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid) return;
        
        // Clear any existing content
        projectsGrid.innerHTML = '';
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'api-error';
        
        // Error icon with animation
        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon';
        errorIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
        
        // Error title with gradient text
        const errorTitle = document.createElement('h3');
        errorTitle.className = 'error-title';
        errorTitle.textContent = 'Project Loading Failed';
        
        // Error message with more details
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        
        // Get error details if available
        let errorDetails = '';
        if (error) {
            if (error.details && error.details.status === 403) {
                errorDetails = `
                    <div class="error-detail">
                        <strong>Status:</strong> Rate Limited
                        <p>GitHub has rate limited the API. Please try again later or check your network settings.</p>
                    </div>
                `;
            } else if (error.message) {
                errorDetails = `
                    <div class="error-detail">
                        <strong>Error:</strong> ${error.message}
                    </div>
                `;
            }
        }
        
        errorMessage.innerHTML = `
            <p>We encountered an issue while fetching projects from GitHub. Here are some possible causes:</p>
            <ul>
                <li>You might be behind a VPN or firewall blocking the request</li>
                <li>GitHub API rate limits might be in effect</li>
                <li>There could be temporary network connectivity issues</li>
                <li>The GitHub service might be temporarily unavailable</li>
            </ul>
            
            ${errorDetails}
            
            <div class="action-buttons">
                <a href="https://github.com/${GITHUB_USERNAME}?tab=repositories" target="_blank" rel="noopener noreferrer" class="github-button">
                    <i class="fab fa-github"></i>
                    View on GitHub
                </a>
            </div>
            
            <p class="small-note">
                <i class="fas fa-info-circle"></i>
                This is a client-side application. For the best experience, ensure you have a stable internet connection.
            </p>
        `;
        
        // Create action buttons container
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        // Retry button
        const retryButton = document.createElement('button');
        retryButton.className = 'retry-button';
        retryButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
            </svg>
            Try Again
        `;
        retryButton.addEventListener('click', fetchGitHubProjects);
        
        // Add elements to the container
        actionButtons.appendChild(retryButton);
        
        // Assemble the error container
        errorContainer.appendChild(errorIcon);
        errorContainer.appendChild(errorTitle);
        errorContainer.appendChild(errorMessage);
        errorContainer.appendChild(actionButtons);
        
        // Add to the DOM
        projectsGrid.appendChild(errorContainer);
        
        // Add a small delay before animating in
        setTimeout(() => {
            errorContainer.style.opacity = '1';
            errorContainer.style.transform = 'translateY(0)';
        }, 50);
        
        // Log the full error to console for debugging
        console.error('GitHub API Error:', {
            message: error?.message,
            status: error?.details?.status,
            stack: error?.stack
        });
    }
    
    // Initialize projects
    const projectsGrid = document.querySelector('.projects-grid');
    if (projectsGrid) {
        // Show loading state
        projectsGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading projects...</p>
            </div>
        `;
        
        // Fetch and display projects
        fetchGitHubProjects();
    }

    // Add animation to elements with the 'animate-on-scroll' class
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const handleScrollAnimation = (entries, scrollObserver) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animationType = element.getAttribute('data-animation') || 'fade-in-up';
                const delay = element.getAttribute('data-delay') || '0';
                
                // Set initial styles
                element.style.opacity = '0';
                
                // Apply the animation after a small delay
                setTimeout(() => {
                    element.classList.add(animationType);
                    
                    // Remove animation class after it completes to allow re-animation if needed
                    const handleAnimationEnd = () => {
                        element.style.opacity = '1';
                        element.removeEventListener('animationend', handleAnimationEnd);
                    };
                    
                    element.addEventListener('animationend', handleAnimationEnd);
                }, parseFloat(delay) * 100);
                
                // Stop observing the current target
                scrollObserver.unobserve(element);
            }
        });
    };
    
    // Configure the intersection observer for scroll animations
    const scrollObserverOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const scrollObserver = new IntersectionObserver(handleScrollAnimation, scrollObserverOptions);
    
    // Observe all elements with the animate-on-scroll class
    animatedElements.forEach(element => {
        scrollObserver.observe(element);
    });
    
    // Add scroll-triggered animations for sections
    const pageSections = document.querySelectorAll('section');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                
                // Add staggered animations to child elements
                const sectionAnimatedElements = entry.target.querySelectorAll('[data-animation]');
                sectionAnimatedElements.forEach((el, index) => {
                    const delay = index * 0.1;
                    el.style.animationDelay = `${delay}s`;
                });
            }
        });
    }, { threshold: 0.2 });
    
    pageSections.forEach(section => {
        sectionObserver.observe(section);
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            }
        });
    });
    
    // Add parallax effect to hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            hero.style.backgroundPositionY = `${scrollPosition * 0.5}px`;
        });
    }
});
